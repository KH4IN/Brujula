drop index if exists public.transactions_import_key_idx;
create unique index transactions_import_key_idx on public.transactions(user_id,import_key);
