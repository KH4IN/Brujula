-- Los datos financieros solo se consultan con una sesión autenticada.
-- RLS sigue siendo la barrera por usuario; retirar el acceso anónimo añade otra barrera.
revoke all privileges on table
  public.transactions,
  public.budgets,
  public.goals,
  public.investments,
  public.account_settings
from anon, public;
