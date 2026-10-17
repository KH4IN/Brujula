import { accountName, CATEGORIES, type AccountSetting, type Transaction } from '../data';
import { CAMPOS_IMPORTAR, useImportar } from '../features/ImportDialog';
import { Hoja, Icono } from './piezas';

const dos = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (iso: string) => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—';

/** Importar extracto en Corriente y Monolito: la lógica es la del diálogo clásico (useImportar); cambia el aspecto. */
export function HojaImportar({ existing, accounts, onConfirm, onClose, clase = 'c-app' }: {
  existing: Transaction[]; accounts: AccountSetting[]; onConfirm: (values: Transaction[]) => void; onClose: () => void; clase?: string;
}) {
  const i = useImportar(existing, onConfirm, onClose);
  const p = i.preview;
  const listo = !!p && !!i.ready.length && !p.needsMapping;
  const elegir = (f: File | null) => void i.load(f);
  return <div className={clase}>
    <Hoja titulo="Importar extracto" abierta onCerrar={onClose}
      pie={<><button type="button" className="boton" onClick={onClose}>Cancelar</button>
        <button type="button" className="boton lleno" disabled={!listo} onClick={i.finish}>{p ? `Importar ${i.ready.length}` : 'Importar'}</button></>}>
      <div className="hoja-cuerpo importar">
        <p className="ayuda">Descarga los movimientos de tu banco en CSV o Excel. Se leen en este dispositivo y solo se guardan los que confirmes.</p>
        <label className="imp-archivo">
          <Icono id="i-sube"/>
          <span><b>{i.file?.name ?? 'Elegir archivo'}</b><small>.xlsx, .csv o .tsv · hasta 8 MB</small></span>
          <input type="file" accept=".xlsx,.csv,.tsv" onChange={(e) => elegir(e.target.files?.[0] ?? null)}/>
        </label>
        <label className="campo"><span>Cuenta</span>
          <select value={i.account} onChange={(e) => { i.setAccount(e.target.value); if (i.file) void i.load(i.file, e.target.value); }}>
            {accounts.map((a) => <option key={a.account} value={a.account}>{accountName(a.account, accounts)}</option>)}
          </select></label>
        {i.loading && <p className="ayuda" role="status">Leyendo el archivo…</p>}
        {i.error && <p className="ayuda alerta" role="alert">{i.error}</p>}
        {p && <>
          <p className="imp-resumen" role="status"><span><b>{i.ready.length}</b> listos</span><span><b>{p.rows.length}</b> en el archivo</span>
            {!!i.duplicates.length && <span><b>{i.duplicates.length}</b> ya estaban</span>}{!!i.invalid.length && <span><b>{i.invalid.length}</b> por revisar</span>}</p>
          {p.openingBalance !== undefined && <p className="ayuda">Saldo inicial del extracto: {dos.format(p.openingBalance)} €. No se cuenta como ingreso.</p>}
          {p.needsMapping && <p className="ayuda alerta" role="status">Indica qué columna es cada cosa y cómo leer los importes para poder importar.</p>}
          {(p.needsMapping || i.active) && <details className="imp-ajustes" open={p.needsMapping}>
            <summary>Ajustar columnas e importes</summary>
            <div className="grupo-hoja">
              {p.warning && <p className="ayuda alerta">{p.warning}</p>}
              {p.sheets.length > 1 && <label className="campo"><span>Hoja</span>
                <select value={i.sheet} onChange={(e) => { const s = p.sheets.find((x) => x.name === e.target.value); i.setSheet(e.target.value); i.setHeader(s?.header ?? 0); i.setColumns(s?.suggested ?? {}); }}>
                  {p.sheets.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select></label>}
              {i.active && <label className="campo"><span>Fila de encabezados</span>
                <select value={i.header} onChange={(e) => { i.setHeader(Number(e.target.value)); i.setColumns({}); }}>
                  {i.active.choices.map((c) => <option key={c.index} value={c.index}>Fila {c.index + 1}: {c.sample}</option>)}</select></label>}
              {i.active && <div className="imp-columnas">{CAMPOS_IMPORTAR.map(([campo, nombre]) => <label key={campo} className="campo"><span>{nombre}</span>
                <select value={i.columns[campo] ?? ''} onChange={(e) => i.setColumns((c) => ({ ...c, [campo]: e.target.value === '' ? undefined : Number(e.target.value) }))}>
                  <option value="">No usar</option>{i.active!.headers.map((h, n) => <option key={n} value={n}>{n + 1}. {h || '(sin nombre)'}</option>)}</select></label>)}</div>}
              <label className="campo"><span>Si hay una sola columna de importe</span>
                <select value={i.signMode} onChange={(e) => i.setSignMode(e.target.value as typeof i.signMode)}>
                  <option value="signed">Negativo es gasto; positivo, ingreso</option><option value="expenses">Todo son gastos</option><option value="income">Todo son ingresos</option></select></label>
              <button type="button" className="boton" disabled={i.loading || !i.file} onClick={() => void i.load(i.file, i.account, true)}>Volver a leer el archivo</button>
            </div>
          </details>}
          {!!p.rows.length && <>
            <datalist id="imp-categorias">{[...new Set([...CATEGORIES, 'Salario', ...p.rows.map((r) => r.category)])].map((c) => <option key={c} value={c}/>)}</datalist>
            <ul className="imp-filas" aria-label="Movimientos del archivo">
              {p.rows.map((r) => { const fuera = !r.valid || r.duplicate; return <li key={r.id} className={fuera ? 'fuera' : ''}>
                <input type="checkbox" aria-label={`Importar ${r.description || 'fila ' + r.line}`} checked={i.selected.has(r.id)} disabled={fuera || p.needsMapping} onChange={(e) => i.toggle(r.id, e.target.checked)}/>
                <span className="imp-texto"><b>{r.merchant && r.merchant !== r.description ? `${r.merchant} · ` : ''}{r.description || 'Sin descripción'}</b>
                  <small>{fecha(r.occurred_on)}{r.reason ? ` · ${r.reason}` : r.duplicate ? ' · Ya está en Brújula' : ''}</small></span>
                <span className={`imp-importe${r.kind === 'income' ? ' entra' : ''}`}>{r.kind === 'income' ? '+' : '−'}{dos.format(r.amount)} €</span>
                <input className="imp-categoria" aria-label={`Categoría de ${r.description || 'fila ' + r.line}`} list="imp-categorias" maxLength={60} disabled={fuera}
                  value={i.categoryEdits[r.id] ?? r.category} onChange={(e) => i.setCategoryEdits((c) => ({ ...c, [r.id]: e.target.value }))}/>
              </li>; })}
            </ul>
            <p className="ayuda">Las categorías son una propuesta: puedes cambiarlas. Lo que ya estaba en Brújula o no se puede leer no se importa.</p>
          </>}
        </>}
      </div>
    </Hoja>
  </div>;
}
