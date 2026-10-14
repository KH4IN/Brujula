import { useEffect, useRef, useState } from 'react';
import { accountName, type AccountSetting, type Investment } from '../data';
import type { VistaNueva } from '../nuevo/Nuevo';
import { esEfectivo, fechaCorta, HojaCuentaBanco, HojaInversion, pct, TIPOS, valor } from '../corriente/Cuentas';
import { cifra } from '../corriente/datos';
import { el, encima, Glifo, quieto } from './piezas';
import { unidadPuntos } from './puntos';

type Parte = { id: string; n: string; v: number; d: string; inv?: boolean };

/** El patrimonio en puntos, agrupados por cuenta e inversión (1 punto = 100 €, o más si no caben). */
function pintarCuentas(cont: HTMLElement, partes: Parte[], unidad: number) {
  const svg = cont.querySelector('svg')!, W = cont.clientWidth; if (!W) return;
  const rot = cont.querySelector<HTMLElement>('.rotulos')!; rot.replaceChildren();
  const filas = 4, nums = partes.map((c) => Math.max(1, Math.round(c.v / unidad))), cols = nums.reduce((a, n) => a + Math.ceil(n / filas), 0) + partes.length - 1;
  const paso = Math.min(20, W / cols), r = paso * 0.33, H = filas * paso + 34;
  svg.setAttribute('width', String(cols * paso)); svg.setAttribute('height', String(H)); svg.replaceChildren();
  let col = 0, k = 0;
  partes.forEach((c, i) => {
    const n = nums[i], ncols = Math.ceil(n / filas);
    const g = el('g', { 'data-g': c.id, tabindex: 0, role: 'img', 'aria-label': `${c.n}: ${cifra(c.v)} €` });
    g.append(el('rect', { x: col * paso, y: 0, width: ncols * paso, height: filas * paso, fill: 'transparent', class: 'ancla' }));
    for (let j = 0; j < n; j++, k++) {
      const p = el('circle', { cx: ((col + Math.floor(j / filas)) * paso + paso / 2).toFixed(1), cy: ((j % filas) * paso + paso / 2).toFixed(1), r, class: `${c.inv ? 'gris' : 'on'} ap` });
      (p as SVGElement).style.setProperty('--d', `${k * 16}ms`); g.append(p);
    }
    svg.append(g);
    if (n >= (W < 520 ? 10 : 5)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rot'; b.dataset.g = c.id;
      const s = document.createElement('span'); s.textContent = c.n; b.append(s); rot.append(b);
      b.style.transform = `translate(${Math.round(Math.min(Math.max(0, col * paso), Math.max(0, W - b.offsetWidth)) + 4)}px, ${Math.round(filas * paso + 8)}px)`;
    }
    col += ncols + 1;
  });
  if (!quieto()) { cont.classList.remove('vivo'); void cont.offsetWidth; cont.classList.add('vivo'); setTimeout(() => cont.classList.remove('vivo'), 2600); }
  const total = partes.reduce((a, x) => a + x.v, 0);
  return encima(cont, (id) => { const c = partes.find((x) => x.id === id); return c ? { n: c.inv ? `${c.n} · inversión` : c.n, v: `${cifra(c.v)}<small>€</small>`, d: `${c.d} · el ${Math.round(c.v / total * 100)} % de tu patrimonio` } : null; });
}

export function Cuentas({ v }: { v: VistaNueva }) {
  const lienzo = useRef<HTMLDivElement>(null);
  const [banco, setBanco] = useState<AccountSetting | 'nueva' | null>(null);
  const [inversion, setInversion] = useState<Investment | 'nueva' | null>(null);
  const enCuentas = v.accounts.map((a) => ({ a, saldo: v.balances[a.account] ?? 0 }));
  const totalCuentas = enCuentas.reduce((s, c) => s + c.saldo, 0), totalInv = v.investments.reduce((s, i) => s + valor(i), 0);
  // Solo lo que suma: una cuenta en negativo no se puede dibujar como puntos de patrimonio.
  const partes: Parte[] = [
    ...enCuentas.map(({ a, saldo }) => ({ id: a.account, n: accountName(a.account, v.accounts), v: saldo, d: esEfectivo(a) ? 'Efectivo' : 'Banco' })),
    ...v.investments.map((i) => ({ id: `inv:${i.id}`, n: i.name, v: valor(i), d: TIPOS[i.asset_type ?? 'other'], inv: true })),
  ].filter((c) => c.v > 0);
  const unidad = unidadPuntos(partes.reduce((s, c) => s + c.v, 0));
  const clave = JSON.stringify([partes, unidad]);
  useEffect(() => {
    if (!lienzo.current || !partes.length) return;
    let quitar = pintarCuentas(lienzo.current, partes, unidad), ancho = innerWidth, t = 0;
    const cambio = () => { if (innerWidth === ancho) return; ancho = innerWidth; clearTimeout(t); t = window.setTimeout(() => { quitar?.(); quitar = lienzo.current ? pintarCuentas(lienzo.current, partes, unidad) : undefined; }, 120); };
    addEventListener('resize', cambio);
    return () => { quitar?.(); removeEventListener('resize', cambio); clearTimeout(t); };
  }, [clave]);
  const ultimo = v.items.filter((t) => t.kind === 'transfer').sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
  const nC = v.accounts.length, nI = v.investments.length;
  return <section className="vista" id="cuentas" aria-labelledby="h-cuentas">
    <div className="vcab">
      <div><h1 id="h-cuentas" tabIndex={-1}>Cuentas</h1><p className="sub">{nC} {nC === 1 ? 'cuenta' : 'cuentas'}{nI ? ` y ${nI} ${nI === 1 ? 'inversión' : 'inversiones'}` : ''} {nC + nI === 1 ? 'forma' : 'forman'} tu patrimonio.</p></div>
      <div className="acciones"><button type="button" className="boton" onClick={v.onTransfer}><Glifo g="mov"/>Traspasar</button></div>
    </div>
    <section className="mod" aria-labelledby="h-patri">
      <div className="tit"><h2 id="h-patri">Patrimonio</h2><span className="escala">1 punto = {cifra(unidad)} €</span></div>
      <div className="patri" style={{ marginTop: 14 }}><p className={`dot${v.wealth < 0 ? ' senal' : ''}`}>{cifra(v.wealth)}<small>€</small></p></div>
      {partes.length > 0 && <>
        <div className="vis" ref={lienzo} style={{ marginTop: 26 }}>
          <svg role="img" aria-label={`Patrimonio en puntos de ${cifra(unidad)} €: ${partes.map((c) => `${c.n} ${Math.max(1, Math.round(c.v / unidad))}`).join(', ')}.`}/>
          <div className="rotulos"/>
          <div className="tip"><p className="n"/><p className="v"/><p className="d"/><p className="d rojo" hidden/></div>
        </div>
        <div className="leyenda" style={{ maxWidth: 640 }}><span><i style={{ background: 'var(--blanco)' }}/>En cuentas · <span className="mono">{cifra(totalCuentas)} €</span></span><span><i style={{ background: 'var(--gris-3)' }}/>Inversiones · <span className="mono">{cifra(totalInv)} €</span></span></div>
      </>}
    </section>
    <div className="rejilla">
      <section className="mod" aria-labelledby="h-encuentas">
        <div className="tit"><h2 id="h-encuentas">En cuentas</h2><button type="button" className="ir" onClick={() => setBanco('nueva')}>Añadir banco<Glifo g="mas"/></button></div>
        <ul className="partes" style={{ marginTop: 12 }}>{enCuentas.map(({ a, saldo }) =>
          <li key={a.account}><button type="button" className="parte-editar" onClick={() => setBanco(a)} aria-label={`Editar ${accountName(a.account, v.accounts)}, ${cifra(saldo)} €`}>
            <span className="dt">{accountName(a.account, v.accounts)}<small>{esEfectivo(a) ? 'Efectivo' : 'Banco'}</small></span><span className="dd">{cifra(saldo)} €</span></button></li>)}</ul>
        {ultimo && <div className="traspaso"><p className="eti">Último traspaso</p>
          <p>{accountName(ultimo.account ?? 'bank', v.accounts)} → {accountName(ultimo.to_account ?? 'cash', v.accounts)} <small>· {fechaCorta(ultimo.occurred_on)}</small></p><span className="mono">{cifra(Number(ultimo.amount))} €</span></div>}
      </section>
      <section className="mod der" aria-labelledby="h-inv">
        <div className="tit"><h2 id="h-inv">Inversiones</h2><button type="button" className="ir" onClick={() => setInversion('nueva')}>Añadir<Glifo g="mas"/></button></div>
        {nI ? <ul className="partes" style={{ marginTop: 12 }}>{v.investments.map((i) => {
          const coste = Number(i.units) * Number(i.average_cost), cambio = coste > 0 ? (valor(i) - coste) / coste * 100 : 0;
          return <li key={i.id}><button type="button" className="parte-editar" onClick={() => setInversion(i)} aria-label={`Editar ${i.name}, ${cifra(valor(i))} €`}>
            <span className="dt">{i.name}<small>{TIPOS[i.asset_type ?? 'other']}{i.ticker ? ` · ${i.ticker}` : ''}</small></span>
            <span className="dd">{cifra(valor(i))} €{coste > 0 && <small className={cambio < 0 ? 'senal' : ''}>{pct.format(cambio)} %</small>}</span></button></li>;
        })}</ul> : <p className="res" style={{ marginTop: 12 }}>Aún no hay inversiones.</p>}
        <p className="res" style={{ marginTop: 12 }}>Solo para mirar: el precio lo actualizas tú y Brújula no compra ni vende.</p>
      </section>
    </div>
    {banco && <HojaCuentaBanco v={v} cuenta={banco} onCerrar={() => setBanco(null)}/>}
    {inversion && <HojaInversion v={v} inversion={inversion} onCerrar={() => setInversion(null)}/>}
  </section>;
}
