import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cifra, type Ritmo } from './datos';

export const Icono = ({ id }: { id: string }) => <svg aria-hidden="true"><use href={`#${id}`}/></svg>;

/** Hoja con la estructura de la maqueta (dialog nativo: foco atrapado y Escape para cerrar). */
export function Hoja({ titulo, abierta, onCerrar, children, pie, atras }: { titulo: string; abierta: boolean; onCerrar: () => void; children: ReactNode; pie?: ReactNode; atras?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (abierta && !d.open) d.showModal(); if (!abierta && d.open) d.close(); }, [abierta]);
  return <dialog ref={ref} className="hoja" aria-label={titulo} onClose={onCerrar} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
    <div className="hoja-cab">
      {atras && <button type="button" className="atras" aria-label="Volver" onClick={atras}><Icono id="i-izq"/></button>}
      <h2>{titulo}</h2>
      <button type="button" className="cerrar" aria-label="Cerrar" onClick={onCerrar}><Icono id="i-x"/></button>
    </div>
    {children}
    {pie && <div className="hoja-pie">{pie}</div>}
  </dialog>;
}

/** Presupuestos con su ritmo: la raya es el límite; el tramo discontinuo, dónde acabarás. */
export function Presupuestos({ filas, onAnadir, onEditar, onQuitar }: { filas: Ritmo[]; onAnadir: () => void; onEditar?: (f: Ritmo) => void; onQuitar?: (f: Ritmo) => void }) {
  if (!filas.length) return <p className="nota">Aún no hay presupuestos este mes. <button type="button" className="ir" onClick={onAnadir}>Añadir uno<Icono id="i-mas"/></button></p>;
  return <>{filas.map((p) => {
    const pp = p.limite > 0 ? p.gastado / p.limite : 0, q = p.limite > 0 ? Math.min(p.previsto / p.limite, 1.24) : 0;
    return <div className="presu-fila" key={p.nombre}>
      <span className="nombre">{p.nombre}</span><span className="imp">{cifra(p.gastado)} / {cifra(p.limite)} €</span>
      <div className="carril" style={{ '--p': Math.min(pp, 1.24).toFixed(3), '--q': q.toFixed(3) } as CSSProperties} role="img" aria-label={`${Math.round(pp * 100)} % del presupuesto`}><i/>{p.pasa ? <s/> : <u/>}</div>
      {p.pasa ? <span className="alerta">A este ritmo, +{cifra(p.previsto - p.limite)} €</span> : <span className="ok">A este ritmo acabarás en {cifra(p.previsto)} €</span>}
      {onEditar && onQuitar && <span className="presu-acciones"><button type="button" onClick={() => onEditar(p)}>Cambiar límite</button><button type="button" onClick={() => onQuitar(p)}>Quitar</button></span>}
    </div>;
  })}</>;
}
