import { useEffect, useMemo, useRef } from 'react';
import { money } from '../data';
import { arcos, grados3, type Rumbo } from './rumbo';
import { asentarAguja, trazarArcos } from './animacion';

const C = 120; // centro de la esfera
const R_ARCO = 110;
const CIRC = 2 * Math.PI * R_ARCO;

const MARCAS = Array.from({ length: 72 }, (_, i) => {
  const a = (i * 5 - 90) * Math.PI / 180;
  const largo = i % 18 === 0 ? 12 : i % 6 === 0 ? 8 : 4;
  const r1 = 100, r2 = r1 - largo;
  return { i, x1: C + r1 * Math.cos(a), y1: C + r1 * Math.sin(a), x2: C + r2 * Math.cos(a), y2: C + r2 * Math.sin(a), fuerte: i % 6 === 0 };
});

/** Esfera de brújula: la aguja marca el rumbo del mes y el anillo exterior reparte los gastos por categoría. */
export function Rosa({ rumbo, grupos, clave, tam = 240 }: {
  rumbo: Rumbo;
  grupos: { category: string; total: number }[];
  clave: string; // cambia al cambiar de mes: la aguja vuelve a asentarse
  tam?: number;
}) {
  const aguja = useRef<SVGGElement | null>(null);
  const esfera = useRef<SVGSVGElement | null>(null);
  const previo = useRef<number | null>(null);
  const tramos = useMemo(() => arcos(grupos, CIRC), [grupos]);

  useEffect(() => {
    const desde = previo.current ?? rumbo.grados - 75;
    previo.current = rumbo.grados;
    return asentarAguja(aguja.current, desde, rumbo.grados);
  }, [rumbo.grados, clave]);
  useEffect(() => trazarArcos(esfera.current), [clave, tramos.length]);

  const etiqueta = rumbo.ahorro === null ? 'Brújula sin rumbo: no hay movimientos este mes' : `Rumbo ${grados3(rumbo.grados)}. ${rumbo.texto}`;
  return <svg ref={esfera} className={`r-rosa r-zona-${rumbo.zona}`} width={tam} height={tam} viewBox="0 0 240 240" role="img" aria-label={etiqueta}>
    <circle cx={C} cy={C} r={117} className="r-rosa-fondo"/>
    <circle cx={C} cy={C} r={R_ARCO} className="r-rosa-pista" fill="none" strokeWidth={8}/>
    <g transform={`rotate(-90 ${C} ${C})`}>
      {tramos.map((t) => <circle key={t.categoria} className="r-arco" cx={C} cy={C} r={R_ARCO} fill="none" stroke={t.color} strokeWidth={8}
        strokeDasharray={`${t.largo} ${CIRC - t.largo}`} strokeDashoffset={-t.inicio}>
        <title>{`${t.categoria}: ${money(t.total)}`}</title>
      </circle>)}
    </g>
    {MARCAS.map((m) => <line key={m.i} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} className={m.i === 0 ? 'r-tick-norte' : m.fuerte ? 'r-tick-fuerte' : 'r-tick'} strokeWidth={m.fuerte ? 1.6 : 1}/>)}
    <text x={C} y={48} textAnchor="middle" className="r-cardinal r-norte">N</text>
    <text x={C + 78} y={C + 4} textAnchor="middle" className="r-cardinal">E</text>
    <text x={C} y={C + 84} textAnchor="middle" className="r-cardinal">S</text>
    <text x={C - 78} y={C + 4} textAnchor="middle" className="r-cardinal">O</text>
    <g ref={aguja} className="r-aguja" style={{ transform: `rotate(${rumbo.grados}deg)` }}>
      <path d={`M${C} 52 L${C + 8} ${C} L${C - 8} ${C} Z`} className="r-aguja-norte"/>
      <path d={`M${C} 188 L${C + 8} ${C} L${C - 8} ${C} Z`} className="r-aguja-sur"/>
      <circle cx={C} cy={C} r={7} className="r-eje"/>
    </g>
  </svg>;
}
