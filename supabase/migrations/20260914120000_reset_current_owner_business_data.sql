-- Intentionally clears one authenticated owner's retail business data.
-- Preserves auth.users, profiles, business_settings, categories, suppliers and schema.
create or replace function public.reset_business_data()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_count bigint;
  v_sale_return_items bigint := 0;
  v_sale_returns bigint := 0;
  v_payments bigint := 0;
  v_sale_items bigint := 0;
  v_sales bigint := 0;
  v_inventory_transactions bigint := 0;
  v_stock_purchases bigint := 0;
  v_customer_product_prices bigint := 0;
  v_customers bigint := 0;
  v_products bigint := 0;
  v_audit_logs bigint := 0;
begin
  if v_owner is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Delete children before parents to respect existing foreign keys.
  delete from public.sale_return_items where owner_id = v_owner;
  get diagnostics v_sale_return_items = row_count;

  delete from public.sale_returns where owner_id = v_owner;
  get diagnostics v_sale_returns = row_count;

  delete from public.payments where owner_id = v_owner;
  get diagnostics v_payments = row_count;

  delete from public.sale_items where owner_id = v_owner;
  get diagnostics v_sale_items = row_count;

  delete from public.sales where owner_id = v_owner;
  get diagnostics v_sales = row_count;

  delete from public.inventory_transactions where owner_id = v_owner;
  get diagnostics v_inventory_transactions = row_count;

  delete from public.stock_purchases where owner_id = v_owner;
  get diagnostics v_stock_purchases = row_count;

  delete from public.customer_product_prices where owner_id = v_owner;
  get diagnostics v_customer_product_prices = row_count;

  delete from public.customers where owner_id = v_owner;
  get diagnostics v_customers = row_count;

  delete from public.products where owner_id = v_owner;
  get diagnostics v_products = row_count;

  delete from public.audit_logs where owner_id = v_owner;
  get diagnostics v_audit_logs = row_count;

  select count(*) into v_count from public.customers where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_CUSTOMERS_FAILED'; end if;
  select count(*) into v_count from public.products where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_PRODUCTS_FAILED'; end if;
  select count(*) into v_count from public.stock_purchases where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_PURCHASES_FAILED'; end if;
  select count(*) into v_count from public.sales where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_SALES_FAILED'; end if;
  select count(*) into v_count from public.sale_items where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_SALE_ITEMS_FAILED'; end if;
  select count(*) into v_count from public.payments where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_PAYMENTS_FAILED'; end if;
  select count(*) into v_count from public.sale_returns where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_RETURNS_FAILED'; end if;
  select count(*) into v_count from public.inventory_transactions where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_INVENTORY_FAILED'; end if;
  select count(*) into v_count from public.customer_product_prices where owner_id = v_owner;
  if v_count <> 0 then raise exception 'RESET_PRICES_FAILED'; end if;

  return jsonb_build_object(
    'success', true,
    'owner_id', v_owner,
    'deleted', jsonb_build_object(
      'sale_return_items', v_sale_return_items,
      'sale_returns', v_sale_returns,
      'payments', v_payments,
      'sale_items', v_sale_items,
      'sales', v_sales,
      'inventory_transactions', v_inventory_transactions,
      'stock_purchases', v_stock_purchases,
      'customer_product_prices', v_customer_product_prices,
      'customers', v_customers,
      'products', v_products,
      'audit_logs', v_audit_logs
    )
  );
end;
$$;

grant execute on function public.reset_business_data() to authenticated;
