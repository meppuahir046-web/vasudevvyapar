-- Keep outstanding balances non-negative after returns while preserving payment history.
drop view if exists public.v_customer_summary;
alter table public.sales drop column pending_amount;
alter table public.sales
  add column pending_amount numeric(14,2)
  generated always as (greatest(total - paid_amount, 0)) stored;

create or replace view public.v_customer_summary with (security_invoker = on) as
select cu.id, cu.owner_id, cu.name, cu.mobile, cu.whatsapp, cu.city, cu.address, cu.active, cu.created_at,
  coalesce(s.orders, 0) as orders,
  coalesce(s.purchased, 0) as total_purchased,
  coalesce(s.paid, 0) as total_paid,
  coalesce(s.pending, 0) as total_pending,
  coalesce(s.profit, 0) as total_profit,
  s.last_sale
from public.customers cu
left join lateral (
  select count(*) as orders,
         sum(total) as purchased,
         sum(paid_amount) as paid,
         sum(greatest(pending_amount, 0)) as pending,
         sum(profit) as profit,
         max(sale_date) as last_sale
  from public.sales sa
  where sa.customer_id = cu.id and sa.status = 'ACTIVE'
) s on true;
grant select on public.v_customer_summary to authenticated;
