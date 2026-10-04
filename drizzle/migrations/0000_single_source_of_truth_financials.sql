-- 1. Sale-level source of truth columns
alter table public.sales alter column pending_amount set expression as
  (case when status = 'CANCELLED' then 0 else greatest(total - paid_amount, 0) end);
alter table public.sales add column if not exists returned_amount numeric(14,2) not null default 0;
alter table public.sales add column received_amount numeric(14,2)
  generated always as (case when status = 'CANCELLED' then 0 else least(greatest(paid_amount,0), greatest(total,0)) end) stored;
alter table public.sales add column credit_amount numeric(14,2)
  generated always as (case when status = 'CANCELLED' then 0 else greatest(paid_amount - total, 0) end) stored;
comment on column public.sales.paid_amount is 'Net cash recorded against the sale (payments minus reversals). Use received_amount for business totals.';
comment on column public.sales.received_amount is 'Valid received: payment applied to the net active sale value (0 when cancelled).';
comment on column public.sales.credit_amount is 'Excess paid over net active sale value after returns: refund/credit due to customer.';

update public.sales s set returned_amount = coalesce((select sum(total_amount) from public.sale_returns r where r.sale_id = s.id), 0);

-- 2. Idempotency keys for reversal effects
alter table public.payments add column if not exists reversal_of uuid references public.payments(id);
create unique index if not exists payments_reversal_of_uniq on public.payments(reversal_of) where reversal_of is not null;
alter table public.inventory_transactions add column if not exists source_item_id uuid;
create unique index if not exists inv_txn_cancel_item_uniq on public.inventory_transactions(source_item_id) where txn_type = 'CANCELLATION' and source_item_id is not null;
create unique index if not exists inv_txn_sale_item_uniq on public.inventory_transactions(source_item_id) where txn_type = 'SALE' and source_item_id is not null;

-- 3. Atomic, idempotent cancellation
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null)
returns void language plpgsql set search_path to 'public' as $$
declare v_owner uuid := auth.uid(); v_status public.sale_status; r record;
begin
  select status into v_status from public.sales where id = p_sale_id and owner_id = v_owner for update;
  if v_status is null then raise exception 'SALE_NOT_FOUND'; end if;
  if v_status = 'CANCELLED' then raise exception 'ALREADY_CANCELLED'; end if;

  for r in select * from public.sale_items where sale_id = p_sale_id for update loop
    if r.quantity - r.returned_quantity > 0 then
      insert into public.inventory_transactions (owner_id, product_id, txn_type, quantity, unit_cost, reference_type, reference_id, source_item_id, notes)
        values (v_owner, r.product_id, 'CANCELLATION', r.quantity - r.returned_quantity, r.unit_cost, 'sale_cancel', p_sale_id, r.id, p_reason);
    end if;
  end loop;

  for r in select p.* from public.payments p where p.sale_id = p_sale_id and not p.is_reversal
      and not exists (select 1 from public.payments x where x.reversal_of = p.id) loop
    insert into public.payments (owner_id, customer_id, sale_id, amount, method, is_reversal, reversal_of, paid_at, notes)
      values (v_owner, r.customer_id, p_sale_id, -r.amount, r.method, true, r.id, current_date, 'Reversal: sale cancelled');
  end loop;

  update public.sales set status = 'CANCELLED', profit = 0 where id = p_sale_id;
  insert into public.audit_logs (owner_id, action, entity, entity_id, details)
    values (v_owner, 'SALE_CANCELLED', 'sales', p_sale_id, jsonb_build_object('reason', p_reason));
end; $$;

-- 4. Atomic return with row locks and non-negative totals
create or replace function public.create_sale_return(p_sale_id uuid, p_items jsonb, p_notes text default null, p_return_date date default current_date)
returns uuid language plpgsql set search_path to 'public' as $$
declare
  v_owner uuid := auth.uid(); v_ret uuid; v_item jsonb; v_cust uuid; v_status public.sale_status;
  si record; v_qty numeric; v_amount numeric := 0; v_cost numeric := 0; v_line numeric; v_line_cost numeric;
begin
  select customer_id, status into v_cust, v_status from public.sales where id = p_sale_id and owner_id = v_owner for update;
  if v_cust is null then raise exception 'SALE_NOT_FOUND'; end if;
  if v_status = 'CANCELLED' then raise exception 'SALE_CANCELLED'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'NO_ITEMS'; end if;

  insert into public.sale_returns (owner_id, sale_id, customer_id, return_date, notes)
    values (v_owner, p_sale_id, v_cust, coalesce(p_return_date, current_date), p_notes) returning id into v_ret;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into si from public.sale_items where id = (v_item->>'sale_item_id')::uuid and sale_id = p_sale_id for update;
    if si.id is null then raise exception 'ITEM_NOT_FOUND'; end if;
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    if si.quantity - si.returned_quantity <= 0.0001 then raise exception 'ALREADY_FULLY_RETURNED'; end if;
    if v_qty > si.quantity - si.returned_quantity + 0.0001 then raise exception 'RETURN_EXCEEDS_SOLD'; end if;
    v_line := least(round(v_qty * si.rate, 2), si.amount);
    v_line_cost := least(round(v_qty * si.unit_cost, 2), si.cost_total);
    insert into public.sale_return_items (owner_id, return_id, sale_item_id, product_id, quantity, rate, amount, unit_cost)
      values (v_owner, v_ret, si.id, si.product_id, v_qty, si.rate, v_line, si.unit_cost);
    insert into public.inventory_transactions (owner_id, product_id, txn_type, quantity, unit_cost, reference_type, reference_id, source_item_id, txn_date)
      values (v_owner, si.product_id, 'SALE_RETURN', v_qty, si.unit_cost, 'sale_return', v_ret, si.id, coalesce(p_return_date, current_date));
    update public.sale_items set returned_quantity = returned_quantity + v_qty,
        amount = amount - v_line, cost_total = cost_total - v_line_cost,
        profit = (amount - v_line) - (cost_total - v_line_cost)
      where id = si.id;
    v_amount := v_amount + v_line;
    v_cost := v_cost + v_line_cost;
  end loop;

  update public.sale_returns set total_amount = v_amount, total_cost = v_cost where id = v_ret;
  update public.sales set subtotal = subtotal - v_amount,
      total = greatest(total - v_amount, 0),
      returned_amount = returned_amount + v_amount,
      cogs = greatest(cogs - v_cost, 0),
      profit = greatest(total - v_amount, 0) - greatest(cogs - v_cost, 0)
    where id = p_sale_id;

  insert into public.audit_logs (owner_id, action, entity, entity_id, details)
    values (v_owner, 'SALE_RETURN', 'sale_returns', v_ret, jsonb_build_object('amount', v_amount));
  return v_ret;
end; $$;

-- 5. Payment validation: block negative/over-pending payments and cancelled sales
create or replace function public.validate_payment()
returns trigger language plpgsql set search_path to 'public' as $$
declare v_total numeric; v_paid numeric; v_status public.sale_status;
begin
  if new.is_reversal then
    if new.reversal_of is not null and exists (select 1 from public.payments where reversal_of = new.reversal_of) then
      raise exception 'ALREADY_REVERSED';
    end if;
    return new;
  end if;
  if new.amount <= 0 then raise exception 'INVALID_PAYMENT'; end if;
  if new.sale_id is not null then
    select total, paid_amount, status into v_total, v_paid, v_status from public.sales where id = new.sale_id for update;
    if v_status = 'CANCELLED' then raise exception 'SALE_CANCELLED'; end if;
    if new.amount > (v_total - v_paid) + 0.001 then raise exception 'PAYMENT_EXCEEDS_OUTSTANDING'; end if;
  end if;
  return new;
end; $$;

-- 6. Customer summary on net values
create or replace view public.v_customer_summary with (security_invoker = on) as
select cu.id, cu.owner_id, cu.name, cu.mobile, cu.whatsapp, cu.city, cu.address, cu.active, cu.created_at,
  coalesce(s.orders, 0) as orders,
  coalesce(s.purchased, 0) as total_purchased,
  coalesce(s.paid, 0) as total_paid,
  coalesce(s.pending, 0) as total_pending,
  coalesce(s.profit, 0) as total_profit,
  s.last_sale,
  coalesce(s.credit, 0) as total_credit,
  coalesce(s.returned, 0) as total_returned,
  coalesce(c.cancelled_orders, 0) as cancelled_orders
from public.customers cu
left join lateral (
  select count(*) as orders, sum(total) as purchased, sum(received_amount) as paid,
         sum(pending_amount) as pending, sum(profit) as profit, max(sale_date) as last_sale,
         sum(credit_amount) as credit, sum(returned_amount) as returned
  from public.sales sa where sa.customer_id = cu.id and sa.status = 'ACTIVE'
) s on true
left join lateral (
  select count(*) as cancelled_orders from public.sales sa where sa.customer_id = cu.id and sa.status = 'CANCELLED'
) c on true;
grant select on public.v_customer_summary to authenticated;

-- 7. One business summary used by Dashboard, Payments, Reports and Excel
create or replace function public.business_summary(p_from date default null, p_to date default null)
returns jsonb language sql stable set search_path to 'public' as $$
  with s as (
    select * from public.sales
    where owner_id = auth.uid()
      and (p_from is null or sale_date >= p_from) and (p_to is null or sale_date <= p_to)
  ), a as (select * from s where status = 'ACTIVE'),
  inv as (select * from public.v_product_inventory where owner_id = auth.uid()),
  pur as (select * from public.stock_purchases where owner_id = auth.uid()
      and (p_from is null or purchase_date >= p_from) and (p_to is null or purchase_date <= p_to)),
  ret as (select r.* from public.sale_returns r join public.sales x on x.id = r.sale_id
      where r.owner_id = auth.uid() and x.status = 'ACTIVE'
      and (p_from is null or r.return_date >= p_from) and (p_to is null or r.return_date <= p_to))
  select jsonb_build_object(
    'net_sales', coalesce((select sum(total) from a), 0),
    'gross_sales', coalesce((select sum(total + returned_amount) from a), 0),
    'returns_amount', coalesce((select sum(returned_amount) from a), 0),
    'returns_in_period', coalesce((select sum(total_amount) from ret), 0),
    'discount', coalesce((select sum(discount) from a), 0),
    'net_cogs', coalesce((select sum(cogs) from a), 0),
    'net_profit', coalesce((select sum(profit) from a), 0),
    'received', coalesce((select sum(received_amount) from a), 0),
    'pending', coalesce((select sum(pending_amount) from a), 0),
    'credit_due', coalesce((select sum(credit_amount) from a), 0),
    'orders', (select count(*) from a),
    'cancelled_orders', (select count(*) from s where status = 'CANCELLED'),
    'cancelled_amount', coalesce((select sum(total) from s where status = 'CANCELLED'), 0),
    'purchases', coalesce((select sum(total_amount) from pur), 0),
    'stock_investment', coalesce((select sum(total_investment) from inv), 0),
    'stock_value', coalesce((select sum(stock_value) from inv), 0),
    'stock_units', coalesce((select sum(current_stock) from inv), 0),
    'products', (select count(*) from inv where active),
    'customers', (select count(*) from public.customers where owner_id = auth.uid())
  );
$$;
grant execute on function public.business_summary(date, date) to authenticated;