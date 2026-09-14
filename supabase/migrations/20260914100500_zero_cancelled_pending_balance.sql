-- A cancelled sale keeps its original total for historical bills, but cannot remain an outstanding customer balance.
alter table public.sales drop column pending_amount;
alter table public.sales
  add column pending_amount numeric(14,2)
  generated always as (
    case when status = 'CANCELLED' then 0 else total - paid_amount end
  ) stored;
