-- Safely remove a product without deleting business history.
create or replace function public.archive_or_delete_product(p_product_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_active boolean;
  v_name text;
  v_stock numeric;
  v_cost numeric;
  v_has_history boolean;
  v_today date := current_date;
begin
  if v_owner is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select active, name into v_active, v_name
  from public.products
  where id = p_product_id and owner_id = v_owner
  for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  select coalesce(sum(quantity), 0), public.product_avg_cost(p_product_id)
    into v_stock, v_cost
  from public.inventory_transactions
  where product_id = p_product_id and owner_id = v_owner;

  select exists (
    select 1 from public.inventory_transactions where product_id = p_product_id and owner_id = v_owner
    union all
    select 1 from public.sale_items where product_id = p_product_id and owner_id = v_owner
    union all
    select 1 from public.stock_purchases where product_id = p_product_id and owner_id = v_owner
    union all
    select 1 from public.sale_return_items where product_id = p_product_id and owner_id = v_owner
  ) into v_has_history;

  if not v_has_history and abs(v_stock) <= 0.0005 then
    delete from public.products where id = p_product_id and owner_id = v_owner;
    return 'DELETED';
  end if;

  if v_stock > 0.0005 then
    insert into public.inventory_transactions (
      owner_id, product_id, txn_type, quantity, unit_cost, reference_type, reference_id, txn_date, notes
    ) values (
      v_owner, p_product_id, 'ADJUSTMENT', -v_stock, v_cost, 'product_archive', p_product_id, v_today,
      'Current stock removed while product was archived'
    );
  end if;

  update public.products set active = false where id = p_product_id and owner_id = v_owner;
  return 'ARCHIVED';
end;
$$;
