-- Replace the product archive/delete RPC with the structured result expected by the website.
drop function if exists public.archive_or_delete_product(uuid);

create or replace function public.archive_or_delete_product(p_product_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_stock numeric := 0;
  v_cost numeric := 0;
  v_has_history boolean := false;
  v_action text;
  v_removed_stock numeric := 0;
begin
  if v_owner is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.products
    where id = p_product_id and owner_id = v_owner
  ) then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

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
    delete from public.products
    where id = p_product_id and owner_id = v_owner;
    v_action := 'deleted';
  else
    if v_stock > 0.0005 then
      v_removed_stock := v_stock;
      insert into public.inventory_transactions (
        owner_id, product_id, txn_type, quantity, unit_cost,
        reference_type, reference_id, txn_date, notes
      ) values (
        v_owner, p_product_id, 'ADJUSTMENT', -v_stock, v_cost,
        'product_archive', p_product_id, current_date,
        'Current stock removed while product was archived'
      );
    end if;

    update public.products
    set active = false
    where id = p_product_id and owner_id = v_owner;
    v_action := 'archived';
  end if;

  return jsonb_build_object(
    'success', true,
    'action', v_action,
    'product_id', p_product_id,
    'removed_stock', v_removed_stock,
    'message', case
      when v_action = 'deleted' then 'Product deleted successfully.'
      else 'Product archived and current stock removed successfully.'
    end
  );
end;
$$;
