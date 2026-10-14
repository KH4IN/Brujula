import type { FormEvent } from 'react';
import { accountName, type AccountSetting, type Budget, type Transaction } from '../data';
import type { FormularioMovimiento } from '../nuevo/HojaMovimiento';
import { Hoja } from './Corriente';

const dos = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Hoja de movimiento del tema Corriente. La validación y el guardado siguen en App, como en el tema nuevo. */
export function HojaAnotar({ form, setForm, editing, busy, notice, accounts, categories, presupuestos, gastado, onSubmit, onDelete, onClose }: {
  form: FormularioMovimiento; setForm: (f: FormularioMovimiento) => void; editing: Transaction | null;
  busy: boolean; notice: string; accounts: AccountSetting[]; categories: string[];
  presupuestos: Budget[]; gastado: (categoria: string) => number;
  onSubmit: (e: FormEvent) => void; onDelete: (t: Transaction) => void; onClose: () => void;
}) {
  const traspaso = form.kind === 'transfer';
  const opciones = accounts.map((a) => <option key={a.account} value={a.account}>{accountName(a.account, accounts)}</option>);
  const limite = presupuestos.find((b) => b.category === form.category);
  const importe = Number(form.amount) || 0, previo = gastado(form.category);
  const ayuda = traspaso ? 'Un traspaso no es gasto ni ingreso: no cambia tu rumbo del mes.'
    : form.kind === 'expense' && limite ? `${form.category} va por ${dos.format(previo)} de ${dos.format(Number(limite.amount))} €. Con esto, ${dos.format(previo + (editing ? 0 : importe))} €.` : '';
  return <div className="c-app">
    <Hoja titulo={traspaso ? 'Traspasar' : editing ? 'Editar movimiento' : 'Movimiento'} abierta onCerrar={onClose}
      pie={<>{editing && <button type="button" className="boton" onClick={() => onDelete(editing)}>Eliminar</button>}
        <button type="button" className="boton" onClick={onClose}>Cancelar</button>
        <button type="submit" form="c-anotar" className="boton lleno" disabled={busy}>{busy ? 'Guardando…' : traspaso ? 'Traspasar' : 'Guardar'}</button></>}>
      <form id="c-anotar" className="hoja-cuerpo" onSubmit={onSubmit}>
        {notice && <p className="ayuda alerta" role="alert">{notice}</p>}
        {!traspaso && <div className="chips" role="group" aria-label="Tipo">
          {(['expense', 'income'] as const).map((k) => <button key={k} type="button" aria-pressed={form.kind === k} onClick={() => setForm({ ...form, kind: k })}>{k === 'expense' ? 'Gasto' : 'Ingreso'}</button>)}
        </div>}
        <label className="importe"><span className="sr">Importe</span>
          <input type="number" inputMode="decimal" step="0.01" min="0.01" max="9999999999.99" required placeholder="0,00" aria-label="Importe en euros"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus={!editing}/><span>€</span></label>
        {!traspaso && <label className="campo"><span>Concepto</span>
          <input maxLength={120} required placeholder="Por ejemplo, cine" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label>}
        {!traspaso && <div className="campo"><span>Categoría</span>
          <div className="chips" role="group" aria-label="Categoría">
            {categories.filter((c) => c !== 'Traspaso').slice(0, 8).map((c) => <button key={c} type="button" aria-pressed={form.category === c} onClick={() => setForm({ ...form, category: c })}>{c}</button>)}
          </div>
          <input aria-label="Otra categoría" list="c-categorias" maxLength={60} required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="U otra categoría"/>
          <datalist id="c-categorias">{categories.map((c) => <option key={c} value={c}/>)}</datalist>
        </div>}
        <div className="dos">
          <label className="campo"><span>{traspaso ? 'Desde' : 'Cuenta'}</span>
            <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value as Transaction['account'] })}>{opciones}</select></label>
          {traspaso
            ? <label className="campo"><span>Hacia</span><select value={form.to_account ?? 'cash'} onChange={(e) => setForm({ ...form, to_account: e.target.value as Transaction['to_account'] })}>{opciones}</select></label>
            : <label className="campo"><span>Fecha</span><input type="date" required value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}/></label>}
        </div>
        {traspaso && <label className="campo"><span>Fecha</span><input type="date" required value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}/></label>}
        {ayuda && <p className="ayuda">{ayuda}</p>}
      </form>
    </Hoja>
  </div>;
}
