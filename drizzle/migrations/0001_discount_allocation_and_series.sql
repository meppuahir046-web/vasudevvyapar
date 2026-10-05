-- Item-level net values: invoice discount allocated proportionally to each line's (post-return) amount.
create or replace view public.v_sale_item_net with (security_invoker = on) as
select si.id, si.owner_id, si.sale_id, si.product_id, si.quantity, si.returned_quantity,
  (si.quantity - si.returned_quantity) as remaining_quantity, si.unit, si.rate,
  round(si.quantity * si.rate, 2) as original_amount,
  round(si.returned_quantity * si.rate, 2) as returned_amount,
  si.amount as line_amount,
  case when sa.status = 'CANCELLED' then 0
       when coalesce(sa.subtotal, 0) = 0 then 0
       else round(si.amount * sa.total / sa.subtotal, 2) end as net_amount,
  case when sa.status = 'CANCELLED' then 0 else si.cost_total end as net_cogs,
  case when sa.status = 'CANCELLED' then 0
       when coalesce(sa.subtotal, 0) = 0 then -si.cost_total
       else round(si.amount * sa.total / sa.subtotal, 2) - si.cost_total end as net_profit,
  sa.status, sa.sale_date, sa.invoice_no, sa.customer_id
from public.sale_items si join public.sales sa on sa.id = si.sale_id;
grant select on public.v_sale_item_net to authenticated;

create or replace view public.v_product_inventory with (security_invoker = on) as
select p.id, p.owner_id, p.name, p.sku, p.brand, p.unit, p.min_stock, p.active, p.default_price,
  p.category_id, c.name as category_name,
  coalesce(t.purchased, 0) as total_purchased,
  coalesce(t.sold, 0) as total_sold,
  coalesce(t.stock, 0) as current_stock,
  coalesce(t.investment, 0) as total_investment,
  coalesce(t.avg_cost, 0) as avg_cost,
  round(coalesce(t.stock, 0) * coalesce(t.avg_cost, 0), 2) as stock_value,
  coalesce(s.revenue, 0) as total_revenue,
  coalesce(s.profit, 0) as total_profit,
  t.last_purchase, s.last_sale,
  (coalesce(t.stock, 0) <= p.min_stock) as is_low_stock
from public.products p
left join public.categories c on c.id = p.category_id
left join lateral (
  select
    sum(case when it.txn_type = 'PURCHASE' then it.quantity else 0 end) as purchased,
    sum(case when it.txn_type in ('SALE','SALE_RETURN','CANCELLATION') then -it.quantity else 0 end) as sold,
    sum(it.quantity) as stock,
    sum(case when it.txn_type = 'PURCHASE' then it.quantity * coalesce(it.unit_cost, 0) else 0 end) as investment,
    case when sum(case when it.quantity > 0 and it.unit_cost is not null then it.quantity else 0 end) > 0
      then sum(case when it.quantity > 0 and it.unit_cost is not null then it.quantity * it.unit_cost else 0 end)
        / sum(case when it.quantity > 0 and it.unit_cost is not null then it.quantity else 0 end)
      else 0 end as avg_cost,
    max(it.txn_date) filter (where it.txn_type = 'PURCHASE') as last_purchase
  from public.inventory_transactions it
  where it.product_id = p.id and it.owner_id = p.owner_id
) t on true
left join lateral (
  select sum(n.net_amount) as revenue, sum(n.net_profit) as profit, max(n.sale_date) as last_sale
  from public.v_sale_item_net n
  where n.product_id = p.id and n.owner_id = p.owner_id and n.status = 'ACTIVE'
) s on true;
grant select on public.v_product_inventory to authenticated;

-- Monthly series from the same sale columns used by business_summary.
create or replace function public.business_monthly(p_from date default null, p_to date default null)
returns table(month text, orders bigint, net_sales numeric, net_cogs numeric, net_profit numeric,
  received numeric, pending numeric, credit_due numeric, returns_amount numeric)
language sql stable set search_path to 'public' as $$
  select to_char(sale_date, 'YYYY-MM'), count(*), sum(total), sum(cogs), sum(profit),
    sum(received_amount), sum(pending_amount), sum(credit_amount), sum(returned_amount)
  from public.sales
  where owner_id = auth.uid() and status = 'ACTIVE'
    and (p_from is null or sale_date >= p_from) and (p_to is null or sale_date <= p_to)
  group by 1 order by 1;
$$;
grant execute on function public.business_monthly(date, date) to authenticated;