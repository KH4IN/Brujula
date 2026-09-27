import { useRef, useState } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import type { Tema } from '../nuevo/rumbo';

const TOQUES_SECRETO = 7;

const OPCIONES: { valor: Tema; titulo: string; detalle: string }[] = [
  { valor: 'nuevo', titulo: 'Tema nuevo', detalle: 'Rumbo: una brújula que marca hacia dónde va tu mes.' },
  { valor: 'antiguo', titulo: 'Tema antiguo', detalle: 'El diseño Ultra de siempre, con sus cuatro perspectivas.' },
  { valor: 'clasico', titulo: 'Diseño clásico', detalle: 'La primera Brújula. Sin movimiento decorativo.' },
];

/** Configuración visual, compartida por todos los temas. Se guarda en este dispositivo. */
export function Configuracion({ tema, dark, clasicoDescubierto, onTema, onModo, onDescubrir, onClose }: {
  tema: Tema;
  dark: boolean;
  clasicoDescubierto: boolean;
  onTema: (tema: Tema) => void;
  onModo: (oscuro: boolean) => void;
  onDescubrir: () => void;
  onClose: () => void;
}) {
  const toques = useRef(0);
  const [hallazgo, setHallazgo] = useState(false);
  const visibles = OPCIONES.filter((o) => o.valor !== 'clasico' || clasicoDescubierto || tema === 'clasico');
  function tocarVersion() {
    if (clasicoDescubierto) return;
    toques.current += 1;
    if (toques.current >= TOQUES_SECRETO) { onDescubrir(); setHallazgo(true); }
  }
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal visual-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-heading"><div><span className="section-kicker">TU EXPERIENCIA</span><h2 id="settings-title">Configuración</h2></div><button className="icon-button" aria-label="Cerrar configuración" onClick={onClose}><X size={20}/></button></div>
      <fieldset className="visual-settings-options tema-opciones">
        <legend>Tema</legend>
        <p>Elige cómo quieres ver Brújula. Tus datos son los mismos en todos los temas.</p>
        {visibles.map((o) => <label key={o.valor} className={tema === o.valor ? 'selected' : ''}>
          <input type="radio" name="tema" value={o.valor} checked={tema === o.valor} onChange={() => onTema(o.valor)}/>
          <span className={`tema-muestra tema-muestra-${o.valor}`} aria-hidden="true"><i/><i/><i/></span>
          <span><strong>{o.titulo}</strong><small>{o.detalle}</small></span>
        </label>)}
        {hallazgo && <p className="tema-hallazgo" role="status">Has encontrado el diseño clásico, el primero de Brújula. Ya puedes elegirlo.</p>}
      </fieldset>
      <fieldset className="visual-settings-options modo-opciones">
        <legend>Modo</legend>
        <label className={!dark ? 'selected' : ''}><input type="radio" name="modo" checked={!dark} onChange={() => onModo(false)}/><span><strong><Sun size={15}/> Día</strong></span></label>
        <label className={dark ? 'selected' : ''}><input type="radio" name="modo" checked={dark} onChange={() => onModo(true)}/><span><strong><Moon size={15}/> Noche</strong></span></label>
      </fieldset>
      <p className="visual-settings-note">Si tu dispositivo pide reducir el movimiento, Brújula lo respeta en cualquier tema.</p>
      <button type="button" className="version-brujula" onClick={tocarVersion} aria-label="Versión de Brújula">BRÚJULA · 2026.09</button>
    </div>
  </div>;
}
