import { useState } from 'react';
import { Activity, ArrowRight, Landmark, Target, TrendingUp, Wallet } from 'lucide-react';

type Section = 'analysis' | 'transactions' | 'budgets' | 'accounts' | 'goals' | 'investments';
const content: Record<Section, { heading: string; description: string; zones: { label: string; title: string; detail: string; target: Section; icon: typeof Activity }[] }> = {
  analysis: { heading: 'Lee las señales.', description: 'Cuatro caminos para entender lo que está pasando este mes.', zones: [
    { label: '01 / BALANCE', title: 'Pulso', detail: 'Compara lo que entra y sale.', target: 'analysis', icon: Activity },
    { label: '02 / HISTORIA', title: 'Movimientos', detail: 'Encuentra el origen de cada cifra.', target: 'transactions', icon: ArrowRight },
    { label: '03 / LÍMITES', title: 'Presupuestos', detail: 'Contrasta gasto y plan.', target: 'budgets', icon: Target },
    { label: '04 / POSICIÓN', title: 'Cuentas', detail: 'Ubica tu dinero disponible.', target: 'accounts', icon: Landmark },
  ] },
  transactions: { heading: 'Cada movimiento cuenta.', description: 'Filtra, investiga y conecta tus operaciones con el resto de tu espacio.', zones: [
    { label: '01 / HISTORIAL', title: 'Explorar', detail: 'Busca y filtra tus operaciones.', target: 'transactions', icon: Activity },
    { label: '02 / CONTEXTO', title: 'Análisis', detail: 'Descubre sus patrones.', target: 'analysis', icon: ArrowRight },
    { label: '03 / ORIGEN', title: 'Cuentas', detail: 'Mira de dónde salen.', target: 'accounts', icon: Landmark },
    { label: '04 / CONTROL', title: 'Presupuestos', detail: 'Compara con tus límites.', target: 'budgets', icon: Target },
  ] },
  budgets: { heading: 'Traza tu plan.', description: 'Tus límites se conectan con gastos reales y objetivos futuros.', zones: [
    { label: '01 / PLAN', title: 'Límites', detail: 'Crea y ajusta tus categorías.', target: 'budgets', icon: Target },
    { label: '02 / REALIDAD', title: 'Análisis', detail: 'Comprueba dónde gastas.', target: 'analysis', icon: Activity },
    { label: '03 / DETALLE', title: 'Movimientos', detail: 'Revisa cada operación.', target: 'transactions', icon: ArrowRight },
    { label: '04 / FUTURO', title: 'Objetivos', detail: 'Convierte el margen en metas.', target: 'goals', icon: Wallet },
  ] },
  accounts: { heading: 'Sitúa cada euro.', description: 'Bancos, efectivo y transferencias en un mismo mapa.', zones: [
    { label: '01 / BANCOS', title: 'Cuentas', detail: 'Consulta los saldos separados.', target: 'accounts', icon: Landmark },
    { label: '02 / EFECTIVO', title: 'Recuento', detail: 'Comprueba tu dinero físico abajo.', target: 'accounts', icon: Wallet },
    { label: '03 / ACTIVIDAD', title: 'Movimientos', detail: 'Sigue entradas y salidas.', target: 'transactions', icon: Activity },
    { label: '04 / CARTERA', title: 'Inversiones', detail: 'Explora el capital invertido.', target: 'investments', icon: TrendingUp },
  ] },
  goals: { heading: 'Dale forma al futuro.', description: 'Cada objetivo es una parte visible de tu plan.', zones: [
    { label: '01 / META', title: 'Objetivos', detail: 'Actualiza tus avances abajo.', target: 'goals', icon: Target },
    { label: '02 / MARGEN', title: 'Presupuestos', detail: 'Busca espacio para ahorrar.', target: 'budgets', icon: Wallet },
    { label: '03 / BASE', title: 'Cuentas', detail: 'Consulta el dinero disponible.', target: 'accounts', icon: Landmark },
    { label: '04 / RITMO', title: 'Análisis', detail: 'Entiende tu tendencia.', target: 'analysis', icon: Activity },
  ] },
  investments: { heading: 'Mira más allá del saldo.', description: 'Una cartera manual, conectada con la posición de tus cuentas.', zones: [
    { label: '01 / CARTERA', title: 'Posiciones', detail: 'Revisa tus activos abajo.', target: 'investments', icon: TrendingUp },
    { label: '02 / CAPITAL', title: 'Cuentas', detail: 'Ubica el origen del dinero.', target: 'accounts', icon: Landmark },
    { label: '03 / HISTORIA', title: 'Movimientos', detail: 'Repasa tus operaciones.', target: 'transactions', icon: Activity },
    { label: '04 / PLAN', title: 'Objetivos', detail: 'Conecta inversión y metas.', target: 'goals', icon: Target },
  ] },
};

export function UltraSectionPanel({ section, onNavigate }: { section: Section; onNavigate: (section: Section) => void }) {
  const [active, setActive] = useState(0);
  const page = content[section];
  const selected = page.zones[active];
  return <section className="ultra-stage ultra-section-stage" aria-label={`Explorar ${section}`}>
    <div className="ultra-stage-heading"><span>BRÚJULA / ULTRA / {section.toUpperCase()}</span><strong>{page.heading}</strong><small>{page.description}</small></div>
    <div className="ultra-quadrants">{page.zones.map((zone, index) => <button type="button" key={zone.label} className={`ultra-quadrant ultra-${(['wealth','flow','plan','explore'] as const)[index]}${active === index ? ' is-active' : ''}`} aria-pressed={active === index} onClick={() => setActive(index)}><zone.icon size={25}/><span>{zone.label}</span><strong>{zone.title}</strong><small>{zone.detail}</small></button>)}</div>
    <div className="ultra-inspector" aria-live="polite"><div><span>{selected.label}</span><strong>{selected.title}</strong><p>{selected.detail}</p></div><button type="button" onClick={() => selected.target === section ? document.getElementById('ultra-detail')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) : onNavigate(selected.target)}>{selected.target === section ? 'Explorar abajo' : 'Abrir sección'} <ArrowRight size={17}/></button></div>
  </section>;
}
