import { useState } from 'react';
import { Activity, ArrowRight, Landmark, Target, TrendingUp } from 'lucide-react';
import { money } from '../data';

type Zone = 'wealth' | 'flow' | 'plan' | 'explore';
type Destination = 'accounts' | 'analysis' | 'budgets' | 'goals' | 'investments' | 'transactions';

/** Experimental four-zone overview. No financial data is changed here. */
export function UltraPanel({ wealth, income, expenses, budget, goals, onNavigate }: {
  wealth: number; income: number; expenses: number; budget: number; goals: number;
  onNavigate: (destination: Destination) => void;
}) {
  const [active, setActive] = useState<Zone>('wealth');
  const zones = [
    { key: 'wealth', eyebrow: '01 / POSICIÓN', title: 'Tu patrimonio', value: money(wealth), detail: 'Una vista de todo tu dinero', icon: Landmark, target: 'accounts' },
    { key: 'flow', eyebrow: '02 / MOVIMIENTO', title: 'Pulso del mes', value: money(income - expenses), detail: `${money(income)} entran · ${money(expenses)} salen`, icon: Activity, target: 'analysis' },
    { key: 'plan', eyebrow: '03 / PLAN', title: 'Tu dirección', value: money(budget), detail: `${goals} objetivos en marcha`, icon: Target, target: 'budgets' },
    { key: 'explore', eyebrow: '04 / EXPLORAR', title: 'Lo que viene', value: 'Descubre más', detail: 'Movimientos, objetivos e inversiones', icon: TrendingUp, target: 'investments' },
  ] as const;
  const selected = zones.find(zone => zone.key === active)!;
  return <section className="ultra-stage" aria-label="Panel Ultra experimental">
    <div className="ultra-stage-heading"><span>BRÚJULA / LABORATORIO</span><strong>Tu universo financiero, en cuatro perspectivas.</strong><small>Elige una zona para explorarla.</small></div>
    <div className="ultra-quadrants">{zones.map(zone => <button key={zone.key} type="button" className={`ultra-quadrant ultra-${zone.key}${active === zone.key ? ' is-active' : ''}`} aria-pressed={active === zone.key} onClick={() => setActive(zone.key)}><zone.icon size={26}/><span>{zone.eyebrow}</span><strong>{zone.title}</strong><b>{zone.value}</b><small>{zone.detail}</small></button>)}</div>
    <div className="ultra-inspector" aria-live="polite"><div><span>{selected.eyebrow}</span><strong>{selected.title}</strong><p>{selected.detail}</p></div><div className="ultra-inspector-actions"><button type="button" onClick={() => onNavigate(selected.target)}>Abrir sección <ArrowRight size={17}/></button>{active === 'plan' && <button type="button" onClick={() => onNavigate('goals')}>Ver objetivos</button>}{active === 'explore' && <button type="button" onClick={() => onNavigate('transactions')}>Ver movimientos</button>}</div></div>
  </section>;
}
