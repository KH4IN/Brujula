import type { Transaction } from './data';

type Cell=string|number|boolean|Date|null;
type Sheet={sheet:string;data:Cell[][]};
export type ImportRow={id:string;sheet:string;line:number;kind:'expense'|'income';occurred_on:string;amount:number;description:string;category:string;import_key:string;valid:boolean;reason?:string;duplicate:boolean;selected:boolean};
export type ImportPreview={rows:ImportRow[];openingBalance?:number;fileName:string};
const tidy=(value:unknown)=>String(value??'').trim().replace(/\s+/g,' ');
const normal=(value:unknown)=>tidy(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dateString=(value:Cell):string|null=>{
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,'0')}-${String(value.getUTCDate()).padStart(2,'0')}`;
  if(typeof value==='number'&&value>25000&&value<80000){const d=new Date(Date.UTC(1899,11,30)+value*86400000);return dateString(d)}
  const text=tidy(value);
  const match=text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  const iso=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
  const parts=match?[Number(match[3]),Number(match[2]),Number(match[1])]:iso?[Number(iso[1]),Number(iso[2]),Number(iso[3])]:null;
  if(!parts)return null;
  const [y,m,d]=parts;const date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
};
const amountNumber=(value:Cell):number|null=>{
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  let text=tidy(value).replace(/[€\s\u00a0]/g,'');if(!text)return null;
  const negative=text.startsWith('(')&&text.endsWith(')');text=text.replace(/[()]/g,'');
  if(!/^[+-]?[\d.,]+$/.test(text))return null;
  const comma=text.lastIndexOf(','),dot=text.lastIndexOf('.');
  if(comma>=0&&dot>=0)text=comma>dot?text.replaceAll('.','').replace(',','.'):text.replaceAll(',','');
  else if(comma>=0)text=/,\d{1,2}$/.test(text)?text.replace(',','.'):text.replaceAll(',','');
  else if(dot>=0&&/^\d{1,3}(\.\d{3})+$/.test(text))text=text.replaceAll('.','');
  const amount=Number(text)*(negative?-1:1);return Number.isFinite(amount)?amount:null;
};
async function keyFor(row:Pick<ImportRow,'kind'|'occurred_on'|'amount'|'description'|'category'>,occurrence:number,account:'bank'|'cash'){
  const value=[account,row.kind,row.occurred_on,row.amount.toFixed(2),normal(row.description),normal(row.category),occurrence].join('|');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function getOpeningBalance(sheets:Sheet[]){const sheet=sheets.find(s=>normal(s.sheet)==='resumen');if(!sheet)return undefined;for(const row of sheet.data)for(let c=0;c<row.length;c++)if(normal(row[c]).includes('saldo inicial')){for(let next=c+1;next<Math.min(c+5,row.length);next++){const amount=amountNumber(row[next]);if(amount!==null)return amount}}return undefined}

export async function parseSheets(sheets:Sheet[],fileName:string,existing:Transaction[],account:'bank'|'cash'):Promise<ImportPreview>{
  const found:Omit<ImportRow,'id'|'import_key'|'duplicate'|'selected'>[]=[];
  for(const sheet of sheets){
    const rows=sheet.data;
    const isTemplate=normal(sheet.sheet)==='transacciones'&&rows.some(row=>normal(row[1])==='fecha'&&normal(row[2])==='importe'&&normal(row[6])==='fecha');
    if(isTemplate){
      const header=rows.findIndex(row=>normal(row[1])==='fecha'&&normal(row[2])==='importe');
      for(let i=header+1;i<rows.length;i++)for(const [dateCol,kind] of [[1,'expense'],[6,'income']] as const){const row=rows[i];const date=row[dateCol],amount=row[dateCol+1],description=row[dateCol+2],category=row[dateCol+3];if(date==null&&amount==null&&description==null)continue;const parsedDate=dateString(date??null),parsedAmount=amountNumber(amount??null);const rounded=Math.round(Math.abs(parsedAmount??0)*100)/100;const reasons=[];if(!parsedDate)reasons.push('Fecha no válida');if(parsedAmount===null||rounded===0||rounded>9999999999.99)reasons.push('Importe no válido');if(!tidy(description))reasons.push('Sin descripción');found.push({sheet:sheet.sheet,line:i+1,kind,occurred_on:parsedDate??'',amount:rounded,description:tidy(description).slice(0,120),category:tidy(category).slice(0,60)||'Otros',valid:!reasons.length,reason:reasons.join(' · ')})}
      continue;
    }
    const headerIndex=rows.findIndex(row=>{const labels=row.map(normal);return labels.some(c=>['fecha','date','dia','día'].includes(c))&&labels.some(c=>['importe','monto','cantidad','amount'].includes(c))});
    if(headerIndex<0)continue;
    const headers=rows[headerIndex].map(normal);
    const col=(...names:string[])=>headers.findIndex(h=>names.includes(h));
    const d=col('fecha','date','dia'),a=col('importe','monto','cantidad','amount'),desc=col('descripcion','descripción','concepto','detalle','description'),cat=col('categoria','categoría','category'),type=col('tipo','type','movimiento');
    for(let i=headerIndex+1;i<rows.length;i++){
      const row=rows[i];if(row.every(v=>v==null||tidy(v)===''))continue;
      const date=dateString(row[d]??null),amount=amountNumber(row[a]??null),label=tidy(desc<0?'':row[desc]);const rawType=normal(type<0?'':row[type]);
      const kind:ImportRow['kind']=/ingreso|entrada|ganancia|income|abono/.test(rawType)?'income':/gasto|salida|expense|cargo/.test(rawType)?'expense':amount!==null&&amount>0?'income':'expense';
      const rounded=Math.round(Math.abs(amount??0)*100)/100;
      const reasons=[];if(!date)reasons.push('Fecha no válida');if(amount===null||rounded===0||rounded>9999999999.99)reasons.push('Importe no válido');if(!label)reasons.push('Sin descripción');
      found.push({sheet:sheet.sheet,line:i+1,kind,occurred_on:date??'',amount:rounded,description:label.slice(0,120),category:tidy(cat<0?'':row[cat]).slice(0,60)||'Otros',valid:!reasons.length,reason:reasons.join(' · ')})
    }
  }
  const counts=new Map<string,number>();const existingKeys=new Set(existing.map(t=>t.import_key).filter(Boolean));
  const rows:ImportRow[]=[];
  for(const row of found){const fingerprint=[row.kind,row.occurred_on,row.amount.toFixed(2),normal(row.description),normal(row.category)].join('|');const n=(counts.get(fingerprint)??0)+1;counts.set(fingerprint,n);const import_key=await keyFor(row,n,account);const duplicate=existingKeys.has(import_key)||existing.some(t=>t.kind===row.kind&&t.occurred_on===row.occurred_on&&Math.abs(Number(t.amount)-row.amount)<.005&&normal(t.description)===normal(row.description)&&normal(t.category)===normal(row.category)&&((t.account??'bank')===account));rows.push({...row,id:crypto.randomUUID(),import_key,duplicate,selected:row.valid&&!duplicate})}
  return {rows,openingBalance:getOpeningBalance(sheets),fileName};
}
export async function parseFile(file:File,existing:Transaction[],account:'bank'|'cash'){
  if(file.size>8*1024*1024)throw Error('El archivo supera 8 MB. Divide el extracto en partes más pequeñas.');
  const extension=file.name.toLowerCase().split('.').pop();let sheets:Sheet[];
  if(extension==='xlsx'){const {default:readExcelFile}=await import('read-excel-file/browser');sheets=await readExcelFile(file) as Sheet[]}
  else if(extension==='csv'||extension==='tsv'){const Papa=(await import('papaparse')).default;const text=await file.text();const parsed=Papa.parse<Cell[]>(text,{skipEmptyLines:true,delimiter:extension==='tsv'?'\t':''});if(parsed.errors.length)throw Error(`No se pudo leer el CSV: ${parsed.errors[0].message}`);sheets=[{sheet:'Movimientos',data:parsed.data}]}
  else throw Error('Usa un archivo .xlsx, .csv o .tsv.');
  const preview=await parseSheets(sheets,file.name,existing,account);
  if(!preview.rows.length)throw Error('No encontré una tabla con Fecha e Importe. Comprueba los encabezados del archivo.');
  if(preview.rows.length>5000)throw Error('El archivo tiene más de 5.000 filas. Divide la importación.');
  return preview;
}
