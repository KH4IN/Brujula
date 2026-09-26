import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, X } from 'lucide-react';

export type GuideSection='dashboard'|'accounts'|'transactions'|'analysis'|'budgets'|'goals'|'investments';
export type GuideProgress={index:number;visited:string[];completed?:boolean};
export const GUIDE_STEPS:{id:string;section:GuideSection;target:string;title:string;copy:string}[]=[
  {id:'home',section:'dashboard',target:'home-summary',title:'Tu panorama',copy:'Aquí tienes patrimonio, ingresos y gastos del mes. Toca cualquier cifra para profundizar.'},
  {id:'paths',section:'dashboard',target:'home-paths',title:'Explora sin perderte',copy:'Estas tarjetas abren las secciones de detalle. La portada se queda con lo esencial.'},
  {id:'accounts',section:'accounts',target:'account-intro',title:'Tus bancos por separado',copy:'Añade cada banco con su saldo inicial. No necesitas conectar tu banco a Brújula.'},
  {id:'cash',section:'accounts',target:'cash-account',title:'Tu efectivo',copy:'Introduce el total directamente. El desglose por billetes y monedas es opcional.'},
  {id:'transactions',section:'transactions',target:'transaction-list',title:'Tus movimientos',copy:'Registra gastos, ingresos y traspasos; también puedes buscar y filtrar por comercio.'},
  {id:'import',section:'transactions',target:'import-action',title:'Importa un extracto',copy:'Elige tu CSV o Excel, revisa la vista previa y confirma solo lo que quieras guardar. Los duplicados se señalan.'},
  {id:'analysis',section:'analysis',target:'analysis-chart',title:'Gráficos que se pueden explorar',copy:'Toca ingresos, gastos, categorías o días para ver los movimientos detrás de cada cifra.'},
  {id:'budgets',section:'budgets',target:'budget-intro',title:'Planifica el mes',copy:'Pon límites por categoría y consulta cuánto has gastado en cada una.'},
  {id:'goals',section:'goals',target:'goal-intro',title:'Objetivos de ahorro',copy:'Marca una meta y actualiza tu progreso. El ahorro reservado no se suma dos veces al patrimonio.'},
  {id:'investments',section:'investments',target:'investment-intro',title:'Inversiones manuales',copy:'Registra cripto o ETF y sus precios cuando quieras; Brújula no consulta mercados por ti.'},
];
export function validGuideProgress(value:unknown):GuideProgress|null{
  if(!value||typeof value!=='object')return null;
  const p=value as Partial<GuideProgress>;
  if(typeof p.index!=='number'||!Number.isInteger(p.index)||p.index<0||p.index>=GUIDE_STEPS.length||!Array.isArray(p.visited))return null;
  return {index:p.index!,visited:[...new Set(p.visited.filter((id):id is string=>typeof id==='string'&&GUIDE_STEPS.some(s=>s.id===id)))],completed:p.completed===true};
}
export function initialGuideProgress(scope:string,remote:unknown):GuideProgress{
  let local:GuideProgress|null=null;
  try{local=validGuideProgress(JSON.parse(localStorage.getItem(`brujula.guide.v2.${scope}`)??'null'))}catch{/* Keep the tour available without storage. */}
  const cloud=validGuideProgress(remote);
  if(!local&&!cloud)return {index:0,visited:[]};
  const visited=[...new Set([...(local?.visited??[]),...(cloud?.visited??[])])];
  const next=GUIDE_STEPS.findIndex(step=>!visited.includes(step.id));
  const saved=local?.index??cloud?.index??0;
  const index=visited.includes(GUIDE_STEPS[saved].id)?next:saved;
  return {index:index<0?0:index,visited,completed:visited.length===GUIDE_STEPS.length};
}

export function Guide({scope,remote,tab,onNavigate,onSave,onClose}:{scope:string;remote:unknown;tab:GuideSection;onNavigate:(section:GuideSection)=>void;onSave:(progress:GuideProgress)=>void;onClose:()=>void}){
  const [progress,setProgress]=useState(()=>initialGuideProgress(scope,remote));
  const [rect,setRect]=useState<DOMRect|null>(null);
  const requested=useRef<GuideSection|null>(null);
  const heading=useRef<HTMLHeadingElement|null>(null);
  const step=GUIDE_STEPS[progress.index];
  useEffect(()=>{onSave(progress)},[progress,onSave]);
  useEffect(()=>{heading.current?.focus({preventScroll:true})},[progress.index]);
  useEffect(()=>{if(tab!==step.section){requested.current=step.section;onNavigate(step.section)}},[progress.index]);
  useEffect(()=>{
    if(requested.current){if(tab===requested.current)requested.current=null;return}
    if(tab===step.section)return;
    const next=GUIDE_STEPS.findIndex(s=>s.section===tab&&!progress.visited.includes(s.id));
    const fallback=GUIDE_STEPS.findIndex(s=>s.section===tab);
    if(next>=0||fallback>=0)setProgress(p=>({...p,index:next>=0?next:fallback}));
  },[tab]);
  useLayoutEffect(()=>{
    const element=document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`);
    if(!element){setRect(null);return}
    element.classList.add('guide-highlight');
    element.scrollIntoView({block:'center',behavior:'instant'});
    const update=()=>setRect(element.getBoundingClientRect());update();
    window.addEventListener('resize',update);window.addEventListener('scroll',update,true);
    return()=>{element.classList.remove('guide-highlight');window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true)};
  },[progress.index,tab]);
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[onClose]);
  function next(){const visited=[...new Set([...progress.visited,step.id])];if(progress.index===GUIDE_STEPS.length-1){onSave({index:0,visited,completed:true});onClose();return}setProgress({index:progress.index+1,visited})}
  const place=rect&&window.innerWidth>750?{
    top:Math.max(90,Math.min(window.innerHeight-270,rect.bottom+12+245<window.innerHeight?rect.bottom+12:rect.top-255)),
    left:Math.max(16,Math.min(window.innerWidth-366,rect.left+Math.min(rect.width,180))),
  }:undefined;
  return <><div className="guide-shade" aria-hidden="true"/><div className="guide-coach" role="dialog" aria-modal="false" aria-labelledby="guide-title" style={place}>
    <div className="guide-top"><span className="section-kicker">RECORRIDO · {progress.index+1} / {GUIDE_STEPS.length}</span><button className="icon-button" aria-label="Pausar guía" onClick={onClose}><X size={18}/></button></div>
    <div className="guide-progress" aria-label={`${progress.visited.length} de ${GUIDE_STEPS.length} puntos vistos`}>{GUIDE_STEPS.map((s,i)=><button key={s.id} type="button" title={s.title} aria-label={`${s.title}${progress.visited.includes(s.id)?', visto':''}`} aria-current={i===progress.index?'step':undefined} className={`${i===progress.index?'current ':''}${progress.visited.includes(s.id)?'visited':''}`} onClick={()=>setProgress(p=>({...p,index:i}))}/>)}</div>
    <h2 ref={heading} tabIndex={-1} id="guide-title">{step.title}</h2><p>{step.copy}</p>
    <div className="guide-actions"><button className="secondary-button" aria-label="Punto anterior" disabled={progress.index===0} onClick={()=>setProgress(p=>({...p,index:p.index-1}))}><ChevronLeft size={17}/></button><button className="primary-button" onClick={next}>{progress.index===GUIDE_STEPS.length-1?'Terminar':'Entendido, siguiente'} <Check size={16}/></button></div>
    <button className="guide-skip" onClick={onClose}>Pausar y seguir otro día</button>
  </div></>;
}
