-- Ejecutar en el editor SQL del proyecto Supabase seleccionado.
create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0 and amount <= 9999999999.99),
  kind text not null check (kind in ('income','expense')),
  category text not null check (category in ('Vivienda','Alimentación','Transporte','Compras','Ocio','Salud','Suscripciones','Otros')),
  description text not null check (char_length(trim(description)) between 1 and 120),
  occurred_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
alter table public.transactions enable row level security;
grant select, insert, update, delete on public.transactions to authenticated;
create policy "Leer movimientos propios" on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear movimientos propios" on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar movimientos propios" on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar movimientos propios" on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  category text not null check (category in ('Vivienda','Alimentación','Transporte','Compras','Ocio','Salud','Suscripciones','Otros')),
  amount numeric(12,2) not null check (amount > 0 and amount <= 9999999999.99),
  unique (user_id, month, category)
);
create index if not exists budgets_user_month_idx on public.budgets(user_id, month);
alter table public.budgets enable row level security;
grant select, insert, update, delete on public.budgets to authenticated;
create policy "Leer presupuestos propios" on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear presupuestos propios" on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar presupuestos propios" on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar presupuestos propios" on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);
