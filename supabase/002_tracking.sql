-- Categorías propias y cuenta de origen para gastos e ingresos.
alter table public.transactions drop constraint if exists transactions_category_check;
alter table public.transactions add constraint transactions_category_check check (char_length(trim(category)) between 1 and 60);
alter table public.budgets drop constraint if exists budgets_category_check;
alter table public.budgets add constraint budgets_category_check check (char_length(trim(category)) between 1 and 60);
alter table public.transactions add column if not exists account text not null default 'bank' check (account in ('bank','cash'));
alter table public.transactions add column if not exists import_key text;
create unique index if not exists transactions_import_key_idx on public.transactions(user_id,import_key);

create table if not exists public.account_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  account text not null check (account in ('bank','cash')),
  opening_balance numeric(12,2) not null default 0 check (opening_balance between -9999999999.99 and 9999999999.99),
  primary key (user_id,account)
);
alter table public.account_settings enable row level security;
grant select,insert,update,delete on public.account_settings to authenticated;
create policy "Leer saldos propios" on public.account_settings for select to authenticated using ((select auth.uid())=user_id);
create policy "Crear saldos propios" on public.account_settings for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Editar saldos propios" on public.account_settings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Borrar saldos propios" on public.account_settings for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
  due_on date,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id);
alter table public.goals enable row level security;
grant select,insert,update,delete on public.goals to authenticated;
create policy "Leer objetivos propios" on public.goals for select to authenticated using ((select auth.uid())=user_id);
create policy "Crear objetivos propios" on public.goals for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Editar objetivos propios" on public.goals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Borrar objetivos propios" on public.goals for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  ticker text,
  units numeric(18,6) not null check (units > 0),
  average_cost numeric(14,4) not null check (average_cost >= 0),
  current_price numeric(14,4) not null check (current_price >= 0),
  funding_account text not null default 'outside' check (funding_account in ('bank','cash','outside')),
  purchased_on date,
  created_at timestamptz not null default now()
);
create index if not exists investments_user_idx on public.investments(user_id);
alter table public.investments enable row level security;
grant select,insert,update,delete on public.investments to authenticated;
create policy "Leer inversiones propias" on public.investments for select to authenticated using ((select auth.uid())=user_id);
create policy "Crear inversiones propias" on public.investments for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Editar inversiones propias" on public.investments for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Borrar inversiones propias" on public.investments for delete to authenticated using ((select auth.uid())=user_id);
