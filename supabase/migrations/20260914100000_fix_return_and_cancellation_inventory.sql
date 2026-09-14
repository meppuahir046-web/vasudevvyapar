-- Keep inventory reporting net of returned and cancelled sale quantities.
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
    sum(case
      when it.txn_type = 'SALE' then -it.quantity
      when it.txn_type in ('SALE_RETURN', 'CANCELLATION') then -it.quantity
      else 0
    end) as sold,
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
