import { useMemo, useState } from 'react';
import { formatDate, money, monthLabel, type Transaction } from '../data';

export function DailyChart({transactions,month,onSelect}:{transactions:Transaction[];month:string;onSelect:(date:string)=>void}){
  const days=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
  const data=useMemo(()=>{
    const amounts=new Map<string,{total:number;count:number}>();
    for(const item of transactions)if(item.kind==='expense'&&item.occurred_on.startsWith(month)){
      const old=amounts.get(item.occurred_on)??{total:0,count:0};
      amounts.set(item.occurred_on,{total:old.total+Number(item.amount),count:old.count+1});
    }
    return Array.from({length:days},(_,index)=>{const day=`${month}-${String(index+1).padStart(2,'0')}`;return{day,...amounts.get(day)??{total:0,count:0}}});
  },[transactions,month,days]);
  const max=Math.max(1,...data.map(d=>d.total));const [selected,setSelected]=useState<string|null>(null);const focus=selected?.startsWith(month)?selected:null;
  const focused=focus?data.find(d=>d.day===focus):null;
  return <section className="card daily-card"><div className="card-heading"><div><span className="section-kicker">CADA DÍA CUENTA</span><h2>Cómo se mueve tu mes</h2><p>Toca una barra para ver el detalle de ese día.</p></div><span className="chart-period">{monthLabel(month)}</span></div><div className="daily-chart" role="group" aria-label="Gastos diarios">{data.map(({day,total})=><button key={day} className={`daily-bar ${focus===day?'chosen':''}`} title={`${formatDate(day)}: ${money(total)}`} aria-label={`${formatDate(day)}: ${money(total)}`} onClick={()=>{setSelected(day);onSelect(day)}}><span style={{height:`${Math.max(total?6:2,total/max*100)}%`}}/></button>)}</div><div className="daily-axis"><span>1</span><span>{Math.ceil(days/2)}</span><span>{days}</span></div>{focused&&<div className="chart-insight"><strong>{formatDate(focused.day)} · {money(focused.total)}</strong><span>{focused.count} gastos registrados. El detalle está en Movimientos.</span></div>}</section>
}
