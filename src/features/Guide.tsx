import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, X } from 'lucide-react';

export type GuideSection='dashboard'|'accounts'|'transactions'|'analysis'|'budgets'|'goals';
const steps:{section:GuideSection;title:string;description:string;hint:string}[]=[
  {section:'dashboard',title:'Empieza por tu panorama',description:'Aquí ves lo esencial del mes. Las tarjetas te llevan al detalle sin llenar la portada de cifras.',hint:'Pulsa una tarjeta para explorar su sección.'},
  {section:'accounts',title:'Dinos dónde está tu dinero',description:'Crea tus bancos y registra el efectivo. El recuento por billetes y monedas es opcional: también puedes poner el total directamente.',hint:'Puedes empezar con datos de prueba y cambiarlos después.'},
  {section:'transactions',title:'Añade un ingreso o un gasto',description:'Registra la cantidad, fecha, cuenta y descripción. Un traspaso mueve dinero entre cuentas sin contarlo como gasto.',hint:'Prueba la pantalla sin guardar ningún movimiento.'},
  {section:'transactions',title:'Importa con calma',description:'Descarga el CSV o Excel de tu banco y usa «Importar archivo». Brújula te enseña una vista previa para revisar fechas, importes, categorías y duplicados antes de confirmar.',hint:'El archivo se lee en tu dispositivo; solo se sincronizan los movimientos confirmados.'},
  {section:'analysis',title:'Entiende tus gráficos',description:'Toca ingresos, gastos, una categoría o una barra diaria para abrir su desglose. Así puedes ver qué hay detrás de cada cifra.',hint:'Los gráficos se calculan con tus movimientos.'},
  {section:'budgets',title:'Planifica sin complicarte',description:'Fija un límite mensual por categoría y comprueba cuánto llevas gastado. En Objetivos puedes seguir una meta de ahorro.',hint:'Puedes omitir estas opciones y volver cuando quieras.'},
];

export function Guide({onClose,onNavigate}:{onClose:()=>void;onNavigate:(section:GuideSection)=>void}){
  const [index,setIndex]=useState(0);
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{closeRef.current?.focus();const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[onClose]);
  const step=steps[index];
  return <div className="modal-backdrop guide-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-description">
      <div className="guide-top"><span className="section-kicker">GUÍA DE BRÚJULA · {index+1} DE {steps.length}</span><button ref={closeRef} className="icon-button" aria-label="Cerrar guía" onClick={onClose}><X size={20}/></button></div>
      <div className="guide-progress" aria-hidden="true">{steps.map((_,i)=><span key={i} className={i<=index?'current':''}/>)}</div>
      <h2 id="guide-title">{step.title}</h2><p id="guide-description">{step.description}</p><div className="guide-hint">{step.hint}</div>
      <div className="guide-actions"><button className="subtle-action" onClick={()=>onNavigate(step.section)}>Ver esta sección <ArrowRight size={15}/></button><div className="guide-next"><button className="secondary-button" onClick={()=>setIndex(i=>i-1)} disabled={index===0} aria-label="Paso anterior"><ChevronLeft size={18}/></button><button className="primary-button" onClick={()=>index===steps.length-1?onClose():setIndex(i=>i+1)}>{index===steps.length-1?'Terminar':'Siguiente'}</button></div></div>
      <button className="guide-skip" onClick={onClose}>Omitir por ahora</button>
    </div>
  </div>
}
