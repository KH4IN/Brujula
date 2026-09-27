import { useEffect, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, Trash2, X } from 'lucide-react';
import { accountName, type AccountSetting, type Transaction } from '../data';
import { colorRumbo } from './rumbo';

export type FormularioMovimiento = {
  amount: string; kind: Transaction['kind']; category: string; description: string;
  occurred_on: string; account: Transaction['account']; to_account: Transaction['to_account'];
};

/** Hoja de alta y edición de un movimiento en el tema nuevo. La validación y el guardado siguen en App. */
export function HojaMovimiento({ form, setForm, editing, busy, notice, accounts, categories, onSubmit, onDelete, onClose }: {
  form: FormularioMovimiento;
  setForm: (f: FormularioMovimiento) => void;
  editing: Transaction | null;
  busy: boolean;
  notice: string;
  accounts: AccountSetting[];
  categories: string[];
  onSubmit: (e: FormEvent) => void;
  onDelete: (t: Transaction) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', tecla); };
  }, [onClose]);
  const tipos: [Transaction['kind'], string, typeof ArrowUpRight][] = [['expense', 'Gasto', ArrowUpRight], ['income', 'Ingreso', ArrowDownLeft], ['transfer', 'Traspaso', ArrowRight]];
  const opcionesCuenta = accounts.map((a) => <option key={a.account} value={a.account}>{accountName(a.account, accounts)}</option>);
  return <div className="r-velo" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <form className={`r-hoja r-hoja-movimiento r-tipo-${form.kind}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={onSubmit}>
      <div className="r-asa" aria-hidden="true"/>
      <div className="r-hoja-cabeza"><h2 id="modal-title">{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</h2><button type="button" className="r-icono r-icono-borde" onClick={onClose} aria-label="Cerrar"><X size={18}/></button></div>
      {notice && <div className="r-aviso" role="alert"><span>{notice}</span></div>}
      <div className="r-segmentos" role="group" aria-label="Tipo de movimiento">
        {tipos.map(([valor, nombre, Icono]) => <button key={valor} type="button" aria-pressed={form.kind === valor}
          onClick={() => setForm({ ...form, kind: valor, description: valor === 'transfer' ? form.description || 'Traspaso entre cuentas' : form.description })}><Icono size={16}/> {nombre}</button>)}
      </div>
      {form.kind === 'transfer' && <p className="r-nota">Un traspaso mueve dinero entre tus cuentas. No cuenta como ingreso ni como gasto.</p>}
      <label className="r-importe">
        <span className="r-kicker">IMPORTE</span>
        <span className="r-importe-campo">
          <input type="number" inputMode="decimal" step="0.01" min="0.01" max="9999999999.99" required placeholder="0,00" aria-label="Importe en euros" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus={!editing}/>
          <span aria-hidden="true">€</span>
        </span>
      </label>
      <label className="r-campo">Descripción<input type="text" maxLength={120} required placeholder="Por ejemplo, compra semanal" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label>
      <div className="r-dos">
        <label className="r-campo">{form.kind === 'transfer' ? 'Desde' : 'Cuenta'}<select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value as Transaction['account'] })}>{opcionesCuenta}</select></label>
        {form.kind === 'transfer'
          ? <label className="r-campo">Hacia<select value={form.to_account ?? 'cash'} onChange={(e) => setForm({ ...form, to_account: e.target.value as Transaction['to_account'] })}>{opcionesCuenta}</select></label>
          : <label className="r-campo">Fecha<input type="date" required value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}/></label>}
      </div>
      {form.kind === 'transfer'
        ? <label className="r-campo">Fecha<input type="date" required value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}/></label>
        : <div className="r-campo">
          <label htmlFor="r-categoria">Categoría</label>
          <div className="r-chips r-chips-categorias" role="group" aria-label="Elegir categoría">
            {categories.filter((c) => c !== 'Traspaso').slice(0, 12).map((c) => <button key={c} type="button" aria-pressed={form.category === c} onClick={() => setForm({ ...form, category: c })}><i style={{ background: colorRumbo(c) }}/>{c}</button>)}
          </div>
          <input id="r-categoria" list="r-categorias" maxLength={60} required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="U otra categoría"/>
          <datalist id="r-categorias">{categories.map((c) => <option key={c} value={c}/>)}</datalist>
        </div>}
      <div className="r-hoja-pie">
        {editing && <button type="button" className="r-boton r-boton-peligro" onClick={() => onDelete(editing)}><Trash2 size={16}/> Eliminar</button>}
        <button className="r-boton r-boton-rumbo r-boton-grande" disabled={busy}><Check size={18}/>{busy ? 'Guardando…' : 'Guardar movimiento'}</button>
      </div>
    </form>
  </div>;
}
