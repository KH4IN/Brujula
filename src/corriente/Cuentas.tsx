import { useEffect, useRef, useState, type FormEvent } from 'react';
import { accountName, localDate, type AccountSetting, type AccountType, type Investment } from '../data';
import { decimal } from '../features/form';
import type { VistaNueva } from '../nuevo/Nuevo';
import { cifra } from './datos';
import { clamp, escena, lineal, MENTA, PERLA, rotulo, smooth } from './escena';
import { Hoja, Icono } from './piezas';
import { euros } from './rio';

type Afluente = { id: string; n: string; v: number; d: string; inv?: boolean };
const TIPOS: Record<NonNullable<Investment['asset_type']>, string> = { crypto: 'Cripto', etf: 'ETF', stock: 'Acción', other: 'Inversión' };
const esEfectivo = (a: AccountSetting) => a.kind === 'cash' || a.account === 'cash';
const valor = (i: Investment) => Number(i.units) * Number(i.current_price);
const pct = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' });
const fechaCorta = (f: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${f}T12:00:00`)).replace('.', '');

/** Los afluentes del patrimonio (maqueta de Corriente): cada cuenta e inversión desemboca en el total. */
function montarAfluentes(lienzo: HTMLElement, cuentas: Afluente[]) {
  return escena(lienzo, (W, H, movil, st) => {
    const total = cuentas.reduce((a, c) => a + c.v, 0);
    // En móvil la cifra del patrimonio va arriba: los ríos empiezan debajo (en la maqueta se pisaban).
    const top = movil ? (lienzo.querySelector<HTMLElement>('.gran')?.offsetHeight ?? 0) + 40 : 0, h = H - top;
    const tw = movil ? h * 0.3 : H * 0.36, k = tw / total;
    const ym = top + h * 0.5, xs = movil ? W * 0.04 : W * 0.2, xc = movil ? W * 0.62 : W * 0.56, xe = movil ? W * 0.98 : W * 0.66;
    const arr = top + h * (movil ? 0.12 : 0.1), aba = top + h * (movil ? 0.9 : 0.92);
    const paso = cuentas.length > 1 ? (aba - arr) / (cuentas.length - 1) : 0;
    let acc = ym - tw / 2;
    const rios = cuentas.map((c, i) => {
      const w = Math.max(c.v * k, 2), yT = acc + w / 2; acc += c.v * k;
      const yS = cuentas.length > 1 ? arr + i * paso : ym;
      const Y = lineal(W, (x) => yS + (yT - yS) * smooth((x - xs) / (xc - xs)));
      const WD = lineal(W, () => w);
      const b = rotulo(st, c.id, [[c.n], [`${cifra(c.v)} €`, 'imp']]);
      b.classList.toggle('menta', !!c.inv);
      const bw = b.offsetWidth || 120;
      b.style.transform = movil ? `translate(8px, ${Math.round(yS - w / 2 - 28)}px)` : `translate(${Math.round(xs - bw - 6 + 8)}px, ${Math.round(yS - 13)}px)`;
      return { Y, WD, x0: movil ? 0 : xs - 4, x1: xe, dir: 1 as const, col: c.inv ? MENTA : PERLA, grupo: c.id, fadeIn: movil ? 20 : 30, fadeOut: movil ? 50 : 90 };
    });
    return {
      vel: clamp(W * 0.07, 40, 120), rios,
      sobre(mx, my) {
        let mejor: string | null = null, dist = 1e9; const ix = clamp(mx | 0, 0, W);
        for (const r of rios) { if (mx > r.x1 || mx < r.x0) continue; const d = Math.abs(my - r.Y[ix]) - r.WD[ix] / 2; if (d < 10 && d < dist) { dist = d; mejor = r.grupo; } }
        return mejor ? { g: mejor } : null;
      },
      info(g) {
        const c = cuentas.find((x) => x.id === g);
        return c ? { n: c.inv ? `${c.n} · inversión` : c.n, v: euros(c.v), d: `${c.d} · el ${Math.round(c.v / total * 100)} % de tu patrimonio`, menta: !!c.inv } : null;
      },
    };
  });
}

/** Alta y cambio de un banco o del efectivo: nombre y saldo inicial (misma validación que el tema clásico). */
function HojaCuentaBanco({ v, cuenta, onCerrar }: { v: VistaNueva; cuenta: AccountSetting | 'nueva'; onCerrar: () => void }) {
  const nueva = cuenta === 'nueva';
  const [nombre, setNombre] = useState(nueva ? '' : accountName(cuenta.account, v.accounts));
  const [saldo, setSaldo] = useState(nueva ? '0' : String(cuenta.opening_balance ?? 0));
  const [error, setError] = useState('');
  function guardar(e: FormEvent) {
    e.preventDefault(); const n = decimal(saldo), etiqueta = nombre.trim();
    if (!Number.isFinite(n) || Math.abs(n) > 9999999999.99) { setError('Escribe un saldo válido en euros.'); return; }
    if (!etiqueta || etiqueta.length > 50) { setError('Ponle un nombre de hasta 50 letras.'); return; }
    if (nueva && v.accounts.some((a) => accountName(a.account, v.accounts).toLocaleLowerCase('es') === etiqueta.toLocaleLowerCase('es'))) { setError('Ya tienes una cuenta con ese nombre.'); return; }
    v.saveAccount(nueva
      ? { account: `bank:${crypto.randomUUID()}` as AccountType, kind: 'bank', name: etiqueta, opening_balance: Math.round(n * 100) / 100 }
      : { ...cuenta, kind: cuenta.kind ?? (esEfectivo(cuenta) ? 'cash' : 'bank'), name: etiqueta, opening_balance: Math.round(n * 100) / 100 });
    onCerrar();
  }
  return <Hoja titulo={nueva ? 'Añadir banco' : `Editar ${accountName(cuenta.account, v.accounts)}`} abierta onCerrar={onCerrar}
    pie={<><button type="button" className="boton" onClick={onCerrar}>Cancelar</button><button type="submit" form="c-cuenta" className="boton lleno">Guardar</button></>}>
    <form id="c-cuenta" className="hoja-cuerpo" onSubmit={guardar}>
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      <label className="campo"><span>Nombre</span><input maxLength={50} required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo, ING Ahorro" autoFocus/></label>
      <label className="importe"><span className="sr">Saldo inicial</span><input type="number" inputMode="decimal" step="0.01" required aria-label="Saldo inicial en euros" value={saldo} onChange={(e) => setSaldo(e.target.value)}/><span>€</span></label>
      <p className="ayuda">Ese es el saldo inicial: lo que había antes de tu primer movimiento anotado. El saldo de hoy se calcula con él y tus movimientos.</p>
    </form>
  </Hoja>;
}

/** Alta, cambio y baja de una inversión. Brújula solo apunta: el precio lo actualizas tú. */
function HojaInversion({ v, inversion, onCerrar }: { v: VistaNueva; inversion: Investment | 'nueva'; onCerrar: () => void }) {
  const i = inversion === 'nueva' ? null : inversion;
  const [f, setF] = useState({ name: i?.name ?? '', ticker: i?.ticker ?? '', asset_type: i?.asset_type ?? 'other', units: i ? String(i.units) : '', average_cost: i ? String(i.average_cost) : '', current_price: i ? String(i.current_price) : '', funding_account: i?.funding_account ?? 'outside', purchased_on: i?.purchased_on ?? '' });
  const [error, setError] = useState('');
  const campo = (k: keyof typeof f) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) });
  function guardar(e: FormEvent) {
    e.preventDefault(); const units = decimal(f.units), average_cost = decimal(f.average_cost), current_price = decimal(f.current_price);
    if (!f.name.trim() || !Number.isFinite(units) || units <= 0 || !Number.isFinite(average_cost) || average_cost < 0 || !Number.isFinite(current_price) || current_price < 0) { setError('Revisa el nombre, las participaciones y los precios.'); return; }
    v.saveInvestment({ id: i?.id ?? crypto.randomUUID(), name: f.name.trim().slice(0, 80), ticker: f.ticker.trim().toUpperCase().slice(0, 20), asset_type: f.asset_type as Investment['asset_type'], units, average_cost, current_price, funding_account: f.funding_account as Investment['funding_account'], purchased_on: f.purchased_on || null });
    onCerrar();
  }
  return <Hoja titulo={i ? `Editar ${i.name}` : 'Añadir inversión'} abierta onCerrar={onCerrar}
    pie={<>{i && <button type="button" className="boton" onClick={() => { if (confirm(`¿Eliminar «${i.name}» de la cartera?`)) { v.deleteInvestment(i.id); onCerrar(); } }}>Eliminar</button>}
      <button type="button" className="boton" onClick={onCerrar}>Cancelar</button><button type="submit" form="c-inversion" className="boton lleno">Guardar</button></>}>
    <form id="c-inversion" className="hoja-cuerpo" onSubmit={guardar}>
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      <label className="campo"><span>Nombre</span><input maxLength={80} required placeholder="Por ejemplo, fondo indexado mundial" autoFocus {...campo('name')}/></label>
      <div className="dos">
        <label className="campo"><span>Tipo</span><select {...campo('asset_type')}>{Object.entries(TIPOS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label className="campo"><span>Símbolo (opcional)</span><input maxLength={20} placeholder="BTC, VWCE…" {...campo('ticker')}/></label>
      </div>
      <div className="dos">
        <label className="campo"><span>Participaciones</span><input type="number" inputMode="decimal" step="any" min="0" required {...campo('units')}/></label>
        <label className="campo"><span>Precio medio de compra (€)</span><input type="number" inputMode="decimal" step="any" min="0" required {...campo('average_cost')}/></label>
      </div>
      <div className="dos">
        <label className="campo"><span>Precio actual (€)</span><input type="number" inputMode="decimal" step="any" min="0" required {...campo('current_price')}/></label>
        <label className="campo"><span>Fecha de compra</span><input type="date" max={localDate()} {...campo('purchased_on')}/></label>
      </div>
      <label className="campo"><span>Pagada desde</span><select {...campo('funding_account')}>
        <option value="outside">Ya contabilizado</option>
        {v.accounts.map((a) => <option key={a.account} value={a.account}>{accountName(a.account, v.accounts)}</option>)}
      </select></label>
      <p className="ayuda">Si eliges una cuenta, lo invertido se descuenta de ella. Las ganancias son estimadas, no ingresos.</p>
    </form>
  </Hoja>;
}

export function Cuentas({ v }: { v: VistaNueva }) {
  const lienzo = useRef<HTMLDivElement>(null);
  const [banco, setBanco] = useState<AccountSetting | 'nueva' | null>(null);
  const [inversion, setInversion] = useState<Investment | 'nueva' | null>(null);
  const enCuentas = v.accounts.map((a) => ({ a, saldo: v.balances[a.account] ?? 0 }));
  const totalCuentas = enCuentas.reduce((s, c) => s + c.saldo, 0);
  // El río solo dibuja lo que suma: una cuenta en negativo no puede desembocar en el patrimonio.
  const afluentes: Afluente[] = [
    ...enCuentas.map(({ a, saldo }) => ({ id: a.account, n: accountName(a.account, v.accounts), v: saldo, d: esEfectivo(a) ? 'Efectivo' : 'Banco' })),
    ...v.investments.map((i) => ({ id: `inv:${i.id}`, n: i.name, v: valor(i), d: TIPOS[i.asset_type ?? 'other'], inv: true })),
  ].filter((c) => c.v > 0);
  const clave = JSON.stringify(afluentes);
  useEffect(() => { if (lienzo.current && afluentes.length) return montarAfluentes(lienzo.current, afluentes); }, [clave]);
  const ultimo = v.items.filter((t) => t.kind === 'transfer').sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
  const nCuentas = v.accounts.length, nInv = v.investments.length;
  const resumen = `${nCuentas} ${nCuentas === 1 ? 'cuenta' : 'cuentas'}${nInv ? ` y ${nInv} ${nInv === 1 ? 'inversión' : 'inversiones'}` : ''} ${nCuentas + nInv === 1 ? 'desemboca' : 'desembocan'} en tu patrimonio.`;
  return <section className="vista marco" id="cuentas" aria-labelledby="h-cuentas">
    <div className="vcab">
      <div><h1 id="h-cuentas" tabIndex={-1}>Cuentas</h1><p className="sub">{resumen}</p></div>
      <div className="acciones"><button type="button" className="boton" onClick={v.onTransfer}><Icono id="i-mov"/>Traspasar</button></div>
    </div>
    <div className="lienzo afluentes" ref={lienzo}>
      <canvas role="img" aria-label={`Patrimonio de ${cifra(v.wealth)} €: ${afluentes.map((c) => `${c.n} ${cifra(c.v)} €`).join(', ')}.`}/>
      <div className="etiquetas"/>
      <div className="gran"><p><span className="cifra">{cifra(v.wealth)}</span><span className="eur">€</span></p><small>de patrimonio</small></div>
      <div className="aviso" role="status" aria-live="polite"><p className="n"/><p className="v"/><p className="d"/><p className="d coral" hidden/></div>
    </div>
    <div className="rejilla">
      <section className="c6" aria-labelledby="h-encuentas">
        <div className="cab"><h2 id="h-encuentas">En cuentas</h2><button type="button" className="ir" onClick={() => setBanco('nueva')}>Añadir banco<Icono id="i-mas"/></button></div>
        <ul className="cuentas">{enCuentas.map(({ a, saldo }) =>
          <li key={a.account}><button type="button" className="cuenta cuenta-editar" onClick={() => setBanco(a)} aria-label={`Editar ${accountName(a.account, v.accounts)}, ${cifra(saldo)} €`}>
            <b>{accountName(a.account, v.accounts)}</b><span className="imp">{cifra(saldo)} €</span><small>{esEfectivo(a) ? 'Efectivo' : 'Banco'}</small>
          </button></li>)}</ul>
        <p className="nota" style={{ marginTop: 12 }}>En total, <span className="cifra">{cifra(totalCuentas)} €</span>.</p>
        {ultimo && <div className="traspaso" style={{ marginTop: 40 }}>
          <p className="eti">Último traspaso</p>
          <p className="flecha">{accountName(ultimo.account ?? 'bank', v.accounts)} <Icono id="i-ir"/> {accountName(ultimo.to_account ?? 'cash', v.accounts)} <span className="nota">· {fechaCorta(ultimo.occurred_on)}</span></p>
          <span className="imp">{cifra(Number(ultimo.amount))} €</span>
        </div>}
      </section>
      <section className="c6" aria-labelledby="h-inv">
        <div className="cab"><h2 id="h-inv">Inversiones</h2><button type="button" className="ir" onClick={() => setInversion('nueva')}>Añadir<Icono id="i-mas"/></button></div>
        {nInv ? <ul className="cuentas">{v.investments.map((i) => {
          const coste = Number(i.units) * Number(i.average_cost), cambio = coste > 0 ? (valor(i) - coste) / coste * 100 : 0;
          return <li key={i.id}><button type="button" className="cuenta cuenta-editar" onClick={() => setInversion(i)} aria-label={`Editar ${i.name}, ${cifra(valor(i))} €`}>
            <b>{i.name}</b><span className="imp">{cifra(valor(i))} €</span>
            <small>{TIPOS[i.asset_type ?? 'other']}{i.ticker ? ` · ${i.ticker}` : ''} · {Number(i.units).toLocaleString('es-ES')} participaciones</small>
            {coste > 0 && <span className={`var ${cambio >= 0 ? 'menta' : 'coral'}`}>{pct.format(cambio)} %</span>}
          </button></li>;
        })}</ul> : <p className="nota">Aún no hay inversiones. <button type="button" className="ir" onClick={() => setInversion('nueva')}>Añadir una<Icono id="i-mas"/></button></p>}
        <p className="nota" style={{ marginTop: 18 }}>Solo para mirar: el precio lo actualizas tú y Brújula no compra ni vende.</p>
      </section>
    </div>
    {banco && <HojaCuentaBanco v={v} cuenta={banco} onCerrar={() => setBanco(null)}/>}
    {inversion && <HojaInversion v={v} inversion={inversion} onCerrar={() => setInversion(null)}/>}
  </section>;
}
