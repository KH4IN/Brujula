-- Ejecutar después de 005_security.sql y antes de activar las cuentas adicionales en producción.
-- Conserva los identificadores bank/cash existentes y las políticas RLS por user_id.
alter table public.account_settings add column if not exists name text default 'Banco';
alter table public.account_settings add column if not exists kind text not null default 'bank';
alter table public.account_settings add column if not exists cash_counts jsonb not null default '{}'::jsonb;
alter table public.account_settings add column if not exists cash_counted_at timestamptz;
update public.account_settings set name = case when account = 'cash' then 'Efectivo' else 'Banco' end where name is null or (account = 'cash' and name = 'Banco');
update public.account_settings set kind = 'cash' where account = 'cash';
alter table public.account_settings alter column name set not null;
alter table public.account_settings drop constraint if exists account_settings_name_check;
alter table public.account_settings add constraint account_settings_name_check check (char_length(trim(name)) between 1 and 50);
alter table public.account_settings drop constraint if exists account_settings_kind_check;
alter table public.account_settings add constraint account_settings_kind_check check (kind in ('bank','cash'));
alter table public.account_settings drop constraint if exists account_settings_cash_counts_check;
alter table public.account_settings add constraint account_settings_cash_counts_check check (jsonb_typeof(cash_counts) = 'object' and pg_column_size(cash_counts) < 4096);
alter table public.account_settings drop constraint if exists account_settings_account_check;
alter table public.account_settings add constraint account_settings_account_check check (account in ('bank','cash') or account ~ '^bank:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

alter table public.transactions drop constraint if exists transactions_account_check;
alter table public.transactions add constraint transactions_account_check check (account in ('bank','cash') or account ~ '^bank:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
alter table public.transactions drop constraint if exists transactions_to_account_check;
alter table public.transactions add constraint transactions_to_account_check check (to_account is null or to_account in ('bank','cash') or to_account ~ '^bank:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

alter table public.investments add column if not exists asset_type text not null default 'other';
alter table public.investments drop constraint if exists investments_asset_type_check;
alter table public.investments add constraint investments_asset_type_check check (asset_type in ('crypto','etf','stock','other'));
alter table public.investments drop constraint if exists investments_funding_account_check;
alter table public.investments add constraint investments_funding_account_check check (funding_account in ('bank','cash','outside') or funding_account ~ '^bank:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
