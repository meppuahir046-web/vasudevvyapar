-- ENUMS
create type public.unit_type as enum ('KG','GRAM','LITER','ML','PIECE','BOX','PACKET','BOTTLE','DOZEN','OTHER');
create type public.inv_txn_type as enum ('PURCHASE','SALE','SALE_RETURN','PURCHASE_RETURN','ADJUSTMENT','CANCELLATION');
create type public.payment_method as enum ('CASH','UPI','BANK','CARD','OTHER');
create type public.sale_status as enum ('ACTIVE','CANCELLED');

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  language text not null default 'en',
  theme text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger t_profiles_upd before update on public.profiles for each row execute function public.touch_updated_at();

-- BUSINESS SETTINGS
create table public.business_settings (
  owner_id uuid primary key,
  business_name text not null default 'My Retail Shop',
  owner_name text,
  address text,
  city text,
  phone text,
  whatsapp text,
  email text,
  gst_number text,
  logo_url text,
  invoice_prefix text not null default 'INV',
  invoice_counter integer not null default 0,
  currency text not null default 'INR',
  invoice_footer text default 'Thank you for your business!',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.business_settings to authenticated;
grant all on public.business_settings to service_role;
alter table public.business_settings enable row level security;
create policy "own settings" on public.business_settings for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger t_settings_upd before update on public.business_settings for each row execute function public.touch_updated_at();

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "own categories" on public.categories for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- SUPPLIERS
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  phone text,
  address text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy "own suppliers" on public.suppliers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  sku text,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  unit public.unit_type not null default 'PIECE',
  min_stock numeric(14,3) not null default 0,
  default_price numeric(14,2) not null default 0,
  description text,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "own products" on public.products for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index idx_products_owner_name on public.products (owner_id, lower(name));
create index idx_products_sku on public.products (owner_id, sku);
create trigger t_products_upd before update on public.products for each row execute function public.touch_updated_at();

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  mobile text,
  whatsapp text,
  address text,
  city text,
  notes text,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "own customers" on public.customers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index idx_customers_owner_name on public.customers (owner_id, lower(name));
create index idx_customers_mobile on public.customers (owner_id, mobile);
create trigger t_customers_upd before update on public.customers for each row execute function public.touch_updated_at();

-- CUSTOMER PRODUCT PRICES
create table public.customer_product_prices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  selling_price numeric(14,2) not null check (selling_price >= 0),
  unit public.unit_type,
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, product_id)
);
grant select, insert, update, delete on public.customer_product_prices to authenticated;
grant all on public.customer_product_prices to service_role;
alter table public.customer_product_prices enable row level security;
create policy "own cpp" on public.customer_product_prices for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger t_cpp_upd before update on public.customer_product_prices for each row execute function public.touch_updated_at();

-- STOCK PURCHASES
create table public.stock_purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_date date not null default current_date,
  quantity numeric(14,3) not null check (quantity > 0),
  unit public.unit_type not null default 'PIECE',
  total_amount numeric(14,2) not null check (total_amount >= 0),
  cost_per_unit numeric(14,4) generated always as (total_amount / quantity) stored,
  invoice_no text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stock_purchases to authenticated;
grant all on public.stock_purchases to service_role;
alter table public.stock_purchases enable row level security;
create policy "own purchases" on public.stock_purchases for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index idx_purchases_date on public.stock_purchases (owner_id, purchase_date);

-- INVENTORY TRANSACTIONS (signed quantity ledger)
create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  txn_type public.inv_txn_type not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,4),
  reference_type text,
  reference_id uuid,
  txn_date date not null default current_date,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.inventory_transactions to authenticated;
grant all on public.inventory_transactions to service_role;
alter table public.inventory_transactions enable row level security;
create policy "own inv txn" on public.inventory_transactions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index idx_inv_txn_product on public.inventory_transactions (product_id);
create index idx_inv_txn_date on public.inventory_transactions (owner_id, txn_date);

-- SALES
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  invoice_no text not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  pending_amount numeric(14,2) generated always as (total - paid_amount) stored,
  cogs numeric(14,2) not null default 0,
  profit numeric(14,2) not null default 0,
  status public.sale_status not null default 'ACTIVE',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, invoice_no)
);
grant select, insert, update, delete on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy "own sales" on public.sales for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index idx_sales_customer on public.sales (customer_id);
create index idx_sales_date on public.sales (owner_id, sale_date);
create index idx_sales_invoice on public.sales (owner_id, invoice_no);
create trigger t_sales_upd before update on public.sales for each row execute function public.touch_updated_at();

-- SALE ITEMS
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  returned_quantity numeric(14,3) not null default 0,
  unit public.unit_type not null default 'PIECE',
  rate numeric(14,2) not null check (rate >= 0),
  amount numeric(14,2) not null,
  unit_cost numeric(14,4) not null default 0,
  cost_total numeric(14,2) not null default 0,
  profit numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sale_items to authenticated;
grant all on public.sale_items to service_role;
alter table public.sale_items enable row level security;
create policy "own sale items" on public.sale_items for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index idx_sale_items_sale on public.sale_items (sale_id);
create index idx_sale_items_product on public.sale_items (product_id);

-- PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete cascade,
  amount numeric(14,2) not null check (amount <> 0),
  method public.payment_method not null default 'CASH',
  reference text,
  notes text,
  is_reversal boolean not null default false,
  paid_at date not null default current_date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "own payments" on public.payments for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index idx_payments_sale on public.payments (sale_id);
create index idx_payments_customer on public.payments (customer_id);
create index idx_payments_date on public.payments (owner_id, paid_at);

-- SALE RETURNS
create table public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  return_date date not null default current_date,
  total_amount numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sale_returns to authenticated;
grant all on public.sale_returns to service_role;
alter table public.sale_returns enable row level security;
create policy "own returns" on public.sale_returns for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.sale_return_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  return_id uuid not null references public.sale_returns(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  rate numeric(14,2) not null,
  amount numeric(14,2) not null,
  unit_cost numeric(14,4) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sale_return_items to authenticated;
grant all on public.sale_return_items to service_role;
alter table public.sale_return_items enable row level security;
create policy "own return items" on public.sale_return_items for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "own audit" on public.audit_logs for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- HELPERS
create or replace function public.product_stock(p_product uuid) returns numeric
language sql stable set search_path = public as $$
  select coalesce(sum(quantity), 0)::numeric from public.inventory_transactions where product_id = p_product;
$$;

create or replace function public.product_avg_cost(p_product uuid) returns numeric
language sql stable set search_path = public as $$
  select case when coalesce(sum(quantity), 0) > 0
      then round(sum(quantity * coalesce(unit_cost,0)) / sum(quantity), 4)
      else 0 end
  from public.inventory_transactions
  where product_id = p_product and quantity > 0 and unit_cost is not null;
$$;

create or replace function public.ensure_business_settings() returns void
language plpgsql set search_path = public as $$
begin
  insert into public.business_settings (owner_id) values (auth.uid()) on conflict (owner_id) do nothing;
end; $$;

create or replace function public.next_invoice_no() returns text
language plpgsql set search_path = public as $$
declare v_prefix text; v_n integer;
begin
  perform public.ensure_business_settings();
  update public.business_settings set invoice_counter = invoice_counter + 1
    where owner_id = auth.uid()
    returning invoice_prefix, invoice_counter into v_prefix, v_n;
  return coalesce(v_prefix,'INV') || '-' || lpad(v_n::text, 5, '0');
end; $$;

-- payment sync
create or replace function public.sync_sale_paid() returns trigger
language plpgsql set search_path = public as $$
declare v_sale uuid;
begin
  v_sale := coalesce(new.sale_id, old.sale_id);
  if v_sale is not null then
    update public.sales s
      set paid_amount = coalesce((select sum(p.amount) from public.payments p where p.sale_id = v_sale), 0)
      where s.id = v_sale;
  end if;
  return null;
end; $$;
create trigger t_payments_sync after insert or update or delete on public.payments
for each row execute function public.sync_sale_paid();

create or replace function public.validate_payment() returns trigger
language plpgsql set search_path = public as $$
declare v_total numeric; v_paid numeric; v_status public.sale_status;
begin
  if new.is_reversal then return new; end if;
  if new.amount <= 0 then raise exception 'INVALID_PAYMENT'; end if;
  if new.sale_id is not null then
    select total, paid_amount, status into v_total, v_paid, v_status from public.sales where id = new.sale_id;
    if v_status = 'CANCELLED' then raise exception 'SALE_CANCELLED'; end if;
    if new.amount > (v_total - v_paid) + 0.001 then raise exception 'PAYMENT_EXCEEDS_OUTSTANDING'; end if;
  end if;
  return new;
end; $$;
create trigger t_payments_validate before insert on public.payments
for each row execute function public.validate_payment();

-- purchase -> inventory ledger
create or replace function public.purchase_to_ledger() returns trigger
language plpgsql set search_path = public as $$
begin
  insert into public.inventory_transactions (owner_id, product_id, txn_type, quantity, unit_cost, reference_type, reference_id, txn_date, notes, is_demo)
  values (new.owner_id, new.product_id, 'PURCHASE', new.quantity, new.total_amount / new.quantity, 'stock_purchase', new.id, new.purchase_date, new.notes, new.is_demo);
  return new;
end; $$;
create trigger t_purchase_ledger after insert on public.stock_purchases
for each row execute function public.purchase_to_ledger();

-- CREATE SALE
create or replace function public.create_sale(
  p_customer_id uuid,
  p_items jsonb,
  p_sale_date date default current_date,
  p_discount numeric default 0,
  p_paid numeric default 0,
  p_payment_method public.payment_method default 'CASH',
  p_notes text default null,
  p_save_prices boolean default false
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_sale uuid; v_inv text; v_item jsonb;
  v_pid uuid; v_qty numeric; v_rate numeric; v_unit public.unit_type;
  v_stock numeric; v_cost numeric; v_amount numeric;
  v_sub numeric := 0; v_cogs numeric := 0; v_total numeric;
  v_item_id uuid;
begin
  if v_owner is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'NO_ITEMS'; end if;
  if coalesce(p_discount,0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;

  v_inv := public.next_invoice_no();
  insert into public.sales (owner_id, invoice_no, customer_id, sale_date, notes)
    values (v_owner, v_inv, p_customer_id, coalesce(p_sale_date, current_date), p_notes)
    returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    if v_rate is null or v_rate < 0 then raise exception 'INVALID_PRICE'; end if;
    select unit into v_unit from public.products where id = v_pid and owner_id = v_owner;
    if v_unit is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
    v_stock := public.product_stock(v_pid);
    if v_qty > v_stock then
      raise exception 'INSUFFICIENT_STOCK:%', (select name from public.products where id = v_pid);
    end if;
    v_cost := public.product_avg_cost(v_pid);
    v_amount := round(v_qty * v_rate, 2);
    insert into public.sale_items (owner_id, sale_id, product_id, quantity, unit, rate, amount, unit_cost, cost_total, profit)
      values (v_owner, v_sale, v_pid, v_qty, v_unit, v_rate, v_amount, v_cost, round(v_qty * v_cost, 2), v_amount - round(v_qty * v_cost, 2))
      returning id into v_item_id;
    insert into public.inventory_transactions (owner_id, product_id, txn_type, quantity, unit_cost, reference_type, reference_id, txn_date)
      values (v_owner, v_pid, 'SALE', -v_qty, v_cost, 'sale', v_sale, coalesce(p_sale_date, current_date));
    v_sub := v_sub + v_amount;
    v_cogs := v_cogs + round(v_qty * v_cost, 2);
    if p_save_prices then
      insert into public.customer_product_prices (owner_id, customer_id, product_id, selling_price, unit)
        values (v_owner, p_customer_id, v_pid, v_rate, v_unit)
        on conflict (customer_id, product_id) do update set selling_price = excluded.selling_price, updated_at = now();
    end if;
  end loop;

  v_total := round(v_sub - coalesce(p_discount,0), 2);
  if v_total < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  update public.sales set subtotal = v_sub, discount = coalesce(p_discount,0), total = v_total,
      cogs = v_cogs, profit = v_total - v_cogs where id = v_sale;

  if coalesce(p_paid,0) > 0 then
    if p_paid > v_total + 0.001 then raise exception 'PAYMENT_EXCEEDS_OUTSTANDING'; end if;
    insert into public.payments (owner_id, customer_id, sale_id, amount, method, paid_at, notes)
      values (v_owner, p_customer_id, v_sale, round(p_paid,2), coalesce(p_payment_method,'CASH'), coalesce(p_sale_date, current_date), 'Payment with sale');
  end if;

  insert into public.audit_logs (owner_id, action, entity, entity_id, details)
    values (v_owner, 'SALE_CREATED', 'sales', v_sale, jsonb_build_object('invoice_no', v_inv, 'total', v_total));
  return v_sale;
end; $$;

-- CANCEL SALE
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null) returns void
language plpgsql set search_path = public as $$
declare v_owner uuid := auth.uid(); v_status public.sale_status; v_cust uuid; r record;
begin
  select status, customer_id into v_status, v_cust from public.sales where id = p_sale_id and owner_id = v_owner;
  if v_status is null then raise exception 'SALE_NOT_FOUND'; end if;
  if v_status = 'CANCELLED' then raise exception 'ALREADY_CANCELLED'; end if;

  for r in select * from public.sale_items where sale_id = p_sale_id loop
    insert into public.inventory_transactions (owner_id, product_id, txn_type, quantity, unit_cost, reference_type, reference_id, notes)
      values (v_owner, r.product_id, 'CANCELLATION', r.quantity - r.returned_quantity, r.unit_cost, 'sale_cancel', p_sale_id, p_reason);
  end loop;

  for r in select * from public.payments where sale_id = p_sale_id and not is_reversal loop
    insert into public.payments (owner_id, customer_id, sale_id, amount, method, is_reversal, paid_at, notes)
      values (v_owner, r.customer_id, p_sale_id, -r.amount, r.method, true, current_date, 'Reversal: sale cancelled');
  end loop;

  update public.sales set status = 'CANCELLED', profit = 0, notes = coalesce(notes,'') where id = p_sale_id;
  insert into public.audit_logs (owner_id, action, entity, entity_id, details)
    values (v_owner, 'SALE_CANCELLED', 'sales', p_sale_id, jsonb_build_object('reason', p_reason));
end; $$;

-- SALE RETURN
create or replace function public.create_sale_return(p_sale_id uuid, p_items jsonb, p_notes text default null, p_return_date date default current_date) returns uuid
language plpgsql set search_path = public as $$
declare
  v_owner uuid := auth.uid(); v_ret uuid; v_item jsonb; v_cust uuid; v_status public.sale_status;
  si record; v_qty numeric; v_amount numeric := 0; v_cost numeric := 0; v_line numeric; v_line_cost numeric;
begin
  select customer_id, status into v_cust, v_status from public.sales where id = p_sale_id and owner_id = v_owner;
  if v_cust is null then raise exception 'SALE_NOT_FOUND'; end if;
  if v_status = 'CANCELLED' then raise exception 'SALE_CANCELLED'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'NO_ITEMS'; end if;

  insert into public.sale_returns (owner_id, sale_id, customer_id, return_date, notes)
    values (v_owner, p_sale_id, v_cust, coalesce(p_return_date, current_date), p_notes) returning id into v_ret;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into si from public.sale_items where id = (v_item->>'sale_item_id')::uuid and sale_id = p_sale_id;
    if si.id is null then raise exception 'ITEM_NOT_FOUND'; end if;
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    if v_qty > si.quantity - si.returned_quantity + 0.0001 then raise exception 'RETURN_EXCEEDS_SOLD'; end if;
    v_line := round(v_qty * si.rate, 2);
    v_line_cost := round(v_qty * si.unit_cost, 2);
    insert into public.sale_return_items (owner_id, return_id, sale_item_id, product_id, quantity, rate, amount, unit_cost)
      values (v_owner, v_ret, si.id, si.product_id, v_qty, si.rate, v_line, si.unit_cost);
    insert into public.inventory_transactions (owner_id, product_id, txn_type, quantity, unit_cost, reference_type, reference_id, txn_date)
      values (v_owner, si.product_id, 'SALE_RETURN', v_qty, si.unit_cost, 'sale_return', v_ret, coalesce(p_return_date, current_date));
    update public.sale_items set returned_quantity = returned_quantity + v_qty,
        amount = amount - v_line, cost_total = cost_total - v_line_cost, profit = (amount - v_line) - (cost_total - v_line_cost)
      where id = si.id;
    v_amount := v_amount + v_line;
    v_cost := v_cost + v_line_cost;
  end loop;

  update public.sale_returns set total_amount = v_amount, total_cost = v_cost where id = v_ret;
  update public.sales set subtotal = subtotal - v_amount, total = total - v_amount,
      cogs = cogs - v_cost, profit = (total - v_amount) - (cogs - v_cost) where id = p_sale_id;

  insert into public.audit_logs (owner_id, action, entity, entity_id, details)
    values (v_owner, 'SALE_RETURN', 'sale_returns', v_ret, jsonb_build_object('amount', v_amount));
  return v_ret;
end; $$;

-- DEMO DATA
create or replace function public.seed_demo_data() returns void
language plpgsql set search_path = public as $$
declare v_owner uuid := auth.uid(); v_prod uuid; v_cust uuid; v_sale uuid;
begin
  perform public.ensure_business_settings();
  insert into public.products (owner_id, name, sku, unit, min_stock, default_price, description, is_demo)
    values (v_owner, 'Haldi (Demo)', 'DEMO-HALDI', 'KG', 10, 130, 'Demo product', true) returning id into v_prod;
  insert into public.customers (owner_id, name, mobile, whatsapp, city, is_demo)
    values (v_owner, 'Test Customer (Demo)', '9999999999', '9999999999', 'Rajkot', true) returning id into v_cust;
  insert into public.customer_product_prices (owner_id, customer_id, product_id, selling_price, unit)
    values (v_owner, v_cust, v_prod, 140, 'KG');
  insert into public.stock_purchases (owner_id, product_id, purchase_date, quantity, unit, total_amount, invoice_no, notes, is_demo)
    values (v_owner, v_prod, current_date - 5, 50, 'KG', 5000, 'DEMO-PUR-1', 'Demo purchase', true);
  v_sale := public.create_sale(v_cust, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 25, 'rate', 140)), current_date, 0, 2000, 'CASH', 'Demo sale', false);
  update public.sales set is_demo = true where id = v_sale;
  update public.payments set is_demo = true where sale_id = v_sale;
end; $$;

create or replace function public.reset_demo_data() returns void
language plpgsql set search_path = public as $$
declare v_owner uuid := auth.uid();
begin
  delete from public.payments where owner_id = v_owner and sale_id in (select id from public.sales where owner_id = v_owner and is_demo);
  delete from public.sales where owner_id = v_owner and is_demo;
  delete from public.stock_purchases where owner_id = v_owner and is_demo;
  delete from public.inventory_transactions where owner_id = v_owner and product_id in (select id from public.products where owner_id = v_owner and is_demo);
  delete from public.customer_product_prices where owner_id = v_owner and (product_id in (select id from public.products where owner_id = v_owner and is_demo) or customer_id in (select id from public.customers where owner_id = v_owner and is_demo));
  delete from public.products where owner_id = v_owner and is_demo;
  delete from public.customers where owner_id = v_owner and is_demo;
end; $$;

-- VIEWS
create view public.v_product_inventory with (security_invoker = on) as
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
    sum(case when it.txn_type = 'SALE' then -it.quantity else 0 end) as sold,
    sum(it.quantity) as stock,
    sum(case when it.txn_type = 'PURCHASE' then it.quantity * coalesce(it.unit_cost,0) else 0 end) as investment,
    case when sum(case when it.quantity > 0 and it.unit_cost is not null then it.quantity else 0 end) > 0
      then sum(case when it.quantity > 0 and it.unit_cost is not null then it.quantity * it.unit_cost else 0 end)
         / sum(case when it.quantity > 0 and it.unit_cost is not null then it.quantity else 0 end)
      else 0 end as avg_cost,
    max(it.txn_date) filter (where it.txn_type = 'PURCHASE') as last_purchase
  from public.inventory_transactions it where it.product_id = p.id
) t on true
left join lateral (
  select sum(si.amount) as revenue, sum(si.profit) as profit, max(sa.sale_date) as last_sale
  from public.sale_items si join public.sales sa on sa.id = si.sale_id
  where si.product_id = p.id and sa.status = 'ACTIVE'
) s on true;
grant select on public.v_product_inventory to authenticated;

create view public.v_customer_summary with (security_invoker = on) as
select cu.id, cu.owner_id, cu.name, cu.mobile, cu.whatsapp, cu.city, cu.address, cu.active, cu.created_at,
  coalesce(s.orders, 0) as orders,
  coalesce(s.purchased, 0) as total_purchased,
  coalesce(s.paid, 0) as total_paid,
  coalesce(s.pending, 0) as total_pending,
  coalesce(s.profit, 0) as total_profit,
  s.last_sale
from public.customers cu
left join lateral (
  select count(*) as orders, sum(total) as purchased, sum(paid_amount) as paid,
         sum(pending_amount) as pending, sum(profit) as profit, max(sale_date) as last_sale
  from public.sales sa where sa.customer_id = cu.id and sa.status = 'ACTIVE'
) s on true;
grant select on public.v_customer_summary to authenticated;