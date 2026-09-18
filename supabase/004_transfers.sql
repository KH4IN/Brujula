alter table public.transactions drop constraint if exists transactions_kind_check;
alter table public.transactions add constraint transactions_kind_check check (kind in ('income','expense','transfer'));
alter table public.transactions add column if not exists to_account text check (to_account in ('bank','cash'));
alter table public.transactions add constraint transactions_transfer_accounts_check check (kind <> 'transfer' or (to_account is not null and account <> to_account));
