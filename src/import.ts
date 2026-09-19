import type { Transaction } from './data';
import { categoryFor, merchantFor } from './categorize';

type Cell = string | number | boolean | Date | null;
type Sheet = { sheet: string; data: Cell[][] };
export type Field = 'date'|'startDate'|'amount'|'debit'|'credit'|'fee'|'description'|'description2'|'merchant'|'category'|'type'|'reference'|'currency'|'state';
export type ColumnMap = Partial<Record<Field, number>>;
export type SignMode = 'signed'|'expenses'|'income';
export type ImportOptions = { sheet?: string; header?: number; columns?: ColumnMap; signMode?: SignMode };
export type ImportRow = { id:string;sheet:string;line:number;kind:'expense'|'income';occurred_on:string;amount:number;description:string;merchant:string|null;category:string;import_key:string;valid:boolean;reason?:string;duplicate:boolean;selected:boolean };
export type ImportPreview = { rows:ImportRow[];openingBalance?:number;fileName:string;sheets:Array<{name:string;header:number;headers:string[];suggested:ColumnMap;choices:Array<{index:number;sample:string}>}>;needsMapping:boolean;warning?:string };
const tidy=(v:unknown)=>String(v??'').trim().replace(/\s+/g,' ');
const normal=(v:unknown)=>tidy(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases:Record<Field,string[]>={
 date:['fecha finalizacion','fecha de finalizacion','fecha completada','date completed utc','completed date','completion date','fecha operacion','fecha movimiento','fecha transaccion','fecha','booking date','date','datum','buchungstag','date operation','data operacao','data','fecha valor','value date'],
 startDate:['fecha inicio','fecha de inicio','started date','date started','date started utc','start date','inicio'],
 amount:['importe eur','importe euro','importe','amount eur','amount','monto','quantia','betrag','montant','importo','valor','total eur'],
 debit:['cargo','cargos','debe','debit','debits','withdrawal','outflow','money out','salida','salidas','gastos','ausgang','belastung','debito'],
 credit:['abono','abonos','haber','credit','credits','deposit','inflow','money in','entrada','entradas','ingresos','eingang','gutschrift','credito'],
 fee:['fee','fees','comision','comisiones','commission','commission fee','gebuhr'],
 description:['descripcion','description','concepto','concept','detalle','detall','libelle','bezeichnung','beschreibung','verwendungszweck','memo','narrative','transaction details','detalhes','descricao','causale'],
 description2:['informacion adicional','additional information','details','referencia comercio','payment reference'],
 merchant:['comercio','merchant','merchant name','counterparty','beneficiary','beneficiario','payee','nombre comercio','empfanger','destinataire'],
 category:['categoria','category','categorie','kategorie'],type:['tipo','type','transaction type','tipo operacion','art','nature'],
 reference:['id transaccion','transaction id','id movimiento','operation id','numero operacion','numero de operacion','referencia bancaria','transaction reference','bank reference','reference id','referencia','reference','id'],
 currency:['moneda','currency','devise','wahrung','divisa','moeda'],
 state:['state','estado','status','statut','status transaccion','transaction status']
};
export function detectColumns(headers:Cell[]):ColumnMap{
 const result:ColumnMap={},used=new Set<number>();
 for(const field of ['date','startDate','debit','credit','amount','fee','description','merchant','description2','category','type','reference','currency','state'] as Field[]){
  let best=0,index=-1;
  headers.forEach((header,i)=>{const h=normal(header);if(!h||used.has(i))return;
   if(field==='amount'&&/^(original|foreign|fee|commission|saldo|balance|exchange)\b/.test(h))return;
   if(field==='date'&&/\b(?:inicio|started|start)\b/.test(h))return;
   if(field==='reference'&&/\b(?:iban|account|cuenta|card|tarjeta)\b/.test(h))return;
   let score=aliases[field].some(a=>normal(a)===h)?10:aliases[field].some(a=>h.startsWith(normal(a)+' '))?5:0;
   if(field==='date'&&/\b(?:valor|value date|valuta)\b/.test(h))score-=3;
   if(field==='date'&&/\b(?:finalizacion|completed|completion)\b/.test(h))score+=4;
   if(field==='amount'&&score>0&&/\b(?:eur|euro)\b/.test(h))score+=2;
   if(score>best){best=score;index=i}
  });if(index>=0){result[field]=index;used.add(index)}
 }return result;
}
const validDate=(y:number,m:number,d:number)=>{const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-'):null};
export function dateString(value:Cell):string|null{
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return validDate(value.getUTCFullYear(),value.getUTCMonth()+1,value.getUTCDate());
 if(typeof value==='number'&&value>25000&&value<80000)return dateString(new Date(Date.UTC(1899,11,30)+value*86400000));
 const str=tidy(value),iso=str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);if(iso)return validDate(+iso[1],+iso[2],+iso[3]);
 const eu=str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})(?:[ T].*)?$/);if(!eu)return null;
 return validDate(+eu[3]<100?2000+ +eu[3]:+eu[3],+eu[2],+eu[1]);
}
export function amountNumber(value:Cell):number|null{
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 let str=tidy(value).replace(/[\s\u00a0\u202f€£$]/g,'');if(!str||str==='-')return null;
 const parens=str.startsWith('(')&&str.endsWith(')'),trailingMinus=str.endsWith('-');str=str.replace(/[()]/g,'');if(trailingMinus)str=str.slice(0,-1);
 if(!/^[+-]?[\d.,']+$/.test(str))return null;str=str.replaceAll("'",'');
 const comma=str.lastIndexOf(','),dot=str.lastIndexOf('.');
 if(comma>=0&&dot>=0)str=comma>dot?str.replaceAll('.','').replace(',','.'):str.replaceAll(',','');
 else if(comma>=0)str=/,\d{1,2}$/.test(str)?str.replace(',','.'):str.replaceAll(',','');
 else if(dot>=0&&/^\d{1,3}(\.\d{3})+$/.test(str))str=str.replaceAll('.','');
 const result=Number(str)*(parens||trailingMinus?-1:1);return Number.isFinite(result)?result:null;
}
function balance(sheets:Sheet[]){const sheet=sheets.find(s=>normal(s.sheet)==='resumen');if(!sheet)return undefined;for(const row of sheet.data)for(let i=0;i<row.length;i++)if(normal(row[i]).includes('saldo inicial'))for(let j=i+1;j<Math.min(i+5,row.length);j++){const n=amountNumber(row[j]);if(n!==null)return n}return undefined}
function layout(sheet:Sheet){let index=-1,score=0,columns:ColumnMap={};sheet.data.slice(0,35).forEach((row,i)=>{const found=detectColumns(row),s=(found.date!==undefined||found.startDate!==undefined?4:0)+(found.amount!==undefined||found.debit!==undefined||found.credit!==undefined?4:0)+(found.description!==undefined||found.merchant!==undefined?2:0)+Object.keys(found).length;if(s>score){index=i;score=s;columns=found}});if(index<0)index=sheet.data.findIndex(row=>row.filter(v=>tidy(v)).length>=3);return{index,score,columns}}
async function hash(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')}
const signature=(r:Pick<ImportRow,'kind'|'occurred_on'|'amount'|'description'>,account:string)=>[account,r.kind,r.occurred_on,r.amount.toFixed(2),normal(r.description)].join('|');
export async function parseSheets(sheets:Sheet[],fileName:string,existing:Transaction[],account:'bank'|'cash',options:ImportOptions={}):Promise<ImportPreview>{
 const previews:ImportPreview['sheets']=[],candidates:Array<Omit<ImportRow,'id'|'import_key'|'duplicate'|'selected'>&{reference:string}>=[];
 let needsMapping=false,warning='';
 const templateFor=(sheet:Sheet)=>normal(sheet.sheet)==='transacciones'&&sheet.data.some(row=>normal(row[1])==='fecha'&&normal(row[2])==='importe'&&normal(row[6])==='fecha');
 const preferred=options.sheet??sheets.find(templateFor)?.sheet??sheets.map(s=>({sheet:s.sheet,...layout(s)})).sort((a,b)=>b.score-a.score)[0]?.sheet;
 for(const sheet of sheets){
  const template=templateFor(sheet);
  if(template){const h=sheet.data.findIndex(row=>normal(row[1])==='fecha'&&normal(row[2])==='importe');
   previews.push({name:sheet.sheet,header:h,headers:(sheet.data[h]??[]).map(tidy),suggested:{date:1,amount:2,description:3,category:4},choices:[{index:h,sample:'Plantilla de gastos e ingresos'}]});
   if(sheet.sheet!==preferred)continue;
   for(let i=h+1;i<sheet.data.length;i++)for(const [col,kind] of [[1,'expense'],[6,'income']] as const){const row=sheet.data[i];if(!row||[row[col],row[col+1],row[col+2]].every(v=>!tidy(v)))continue;
    const date=dateString(row[col]??null),amount=amountNumber(row[col+1]??null),description=tidy(row[col+2]).slice(0,120);
    const reasons=[!date&&'Fecha no válida',(amount===null||Math.abs(amount)<.005||Math.abs(amount)>9999999999.99)&&'Importe no válido',!description&&'Sin descripción'].filter(Boolean);
    candidates.push({sheet:sheet.sheet,line:i+1,kind,occurred_on:date??'',amount:Math.round(Math.abs(amount??0)*100)/100,description,merchant:merchantFor(description),category:tidy(row[col+3]).slice(0,60)||categoryFor(description,kind),valid:!reasons.length,reason:reasons.join(' · '),reference:''})
   }continue;
  }
  const detected=layout(sheet);if(detected.index<0)continue;
  const header=options.sheet===sheet.sheet&&options.header!==undefined?options.header:detected.index;
  const headers=sheet.data[header]??[],columns=options.sheet===sheet.sheet&&options.columns&&Object.values(options.columns).some(v=>v!==undefined)?options.columns:detectColumns(headers);
  previews.push({name:sheet.sheet,header,headers:headers.map(tidy),suggested:columns,choices:sheet.data.slice(0,30).map((row,index)=>({index,sample:row.map(tidy).filter(Boolean).slice(0,3).join(' · ').slice(0,105)})).filter(row=>row.sample)});if(sheet.sheet!==preferred)continue;
  if(columns.date===undefined&&columns.startDate===undefined||(columns.amount===undefined&&columns.debit===undefined&&columns.credit===undefined)||(columns.description===undefined&&columns.merchant===undefined)){needsMapping=true;continue}
  const read=(row:Cell[],field:Field)=>columns[field]===undefined?'':tidy(row[columns[field]!]);
  const content=sheet.data.slice(header+1).filter(row=>row.some(v=>tidy(v)));
  if(columns.amount!==undefined&&columns.type===undefined&&columns.debit===undefined&&columns.credit===undefined&&options.signMode===undefined&&content.length&&content.every(row=>(amountNumber(row[columns.amount!]??null)??0)>=0)){needsMapping=true;warning='Todos los importes son positivos y no hay columna de tipo. Indica si son gastos o ingresos.'}
  for(let i=header+1;i<sheet.data.length;i++){
   const row=sheet.data[i];if(!row||row.every(v=>!tidy(v)))continue;
   const completed=columns.date===undefined?'':read(row,'date'),state=normal(read(row,'state'));
   const date=dateString(completed||read(row,'startDate')),debit=columns.debit===undefined?null:amountNumber(row[columns.debit]??null),credit=columns.credit===undefined?null:amountNumber(row[columns.credit]??null),amount=columns.amount===undefined?null:amountNumber(row[columns.amount]??null),fee=columns.fee===undefined?null:amountNumber(row[columns.fee]??null);
   const hasDebit=debit!==null&&Math.abs(debit)>.004,hasCredit=credit!==null&&Math.abs(credit)>.004,type=normal(read(row,'type'));
   const expenseType=/\b(?:expense|debit|card payment|card transaction|cargo|gasto|salida|pago|lastschrift|belastung|debito|sortie)\b/.test(type),incomeType=/\b(?:income|credit|abono|ingreso|entrada|deposit|interest|intereses|dividend|dividendo|refund|reembolso|gutschrift|credito|entree)\b/.test(type);
   const kind:ImportRow['kind']=hasDebit?'expense':hasCredit?'income':expenseType?'expense':incomeType?'income':options.signMode==='expenses'?'expense':options.signMode==='income'?'income':(amount??0)<0?'expense':'income';
   const value=hasDebit?debit:hasCredit?credit:amount,shop=read(row,'merchant'),description=[read(row,'description'),read(row,'description2'),shop].filter((x,ix,arr)=>x&&arr.indexOf(x)===ix).join(' | ').slice(0,120),currency=normal(read(row,'currency'));
   const unsettled=/\b(?:pending|pendiente|processing|en proceso|reverted|revertido|reversado|cancelled|canceled|cancelado|declined|rechazado|failed|fallido)\b/.test(state);
   const investment=/\b(?:buy|sell|purchase shares|securities purchase|securities sale|sparplan|savings plan|compra acciones|venta acciones|compra etf|venta etf|wertpapierkauf|wertpapierverkauf)\b/.test(type);
   const reasons=[!date&&'Fecha no válida',(value===null||Math.abs(value)<.005||Math.abs(value)>9999999999.99)&&'Importe no válido',hasDebit&&hasCredit&&'Cargo y abono simultáneos',expenseType&&incomeType&&'Tipo contradictorio',!description&&'Sin descripción',currency&&currency!=='eur'&&currency!=='euro'&&'Divisa distinta de EUR',fee!==null&&Math.abs(fee)>.004&&'Comisión separada: revisa si está incluida en el importe',unsettled&&'Movimiento pendiente, rechazado o anulado',investment&&'Compra o venta de inversión: regístrala en Inversiones'].filter(Boolean);
   if(columns.type!==undefined&&!expenseType&&!incomeType&&amount!==null&&amount>=0&&options.signMode===undefined&&!hasDebit&&!hasCredit){reasons.push('Tipo de movimiento no reconocido');needsMapping=true}
   if(!description&&!date&&value===null&&/\b(?:total|saldo|balance|summe)\b/.test(normal(row.join(' '))))continue;
   candidates.push({sheet:sheet.sheet,line:i+1,kind,occurred_on:date??'',amount:Math.round(Math.abs(value??0)*100)/100,description,merchant:merchantFor(description)??(shop||null),category:read(row,'category').slice(0,60)||categoryFor(description,kind),valid:!reasons.length,reason:reasons.join(' · '),reference:read(row,'reference')})
  }
 }
 const oldKeys=new Set(existing.map(t=>t.import_key).filter(Boolean)),oldCounts=new Map<string,number>();
 for(const t of existing)if(t.kind!=='transfer'){const sig=signature({...t,kind:t.kind},t.account??'bank');oldCounts.set(sig,(oldCounts.get(sig)??0)+1)}
 const occurrences=new Map<string,number>(),refs=new Set<string>(),rows:ImportRow[]=[];
 for(const candidate of candidates){const sig=signature(candidate,account),count=(occurrences.get(sig)??0)+1;occurrences.set(sig,count);
  const ref=normal(candidate.reference),basis=ref?['ref',account,ref,candidate.occurred_on,candidate.amount.toFixed(2),candidate.kind].join('|'):['content',sig,count].join('|');
  const import_key=await hash(basis),duplicate=candidate.valid&&(oldKeys.has(import_key)||(oldCounts.get(sig)??0)>=count||Boolean(ref&&refs.has(basis)));
  if(ref)refs.add(basis);rows.push({...candidate,id:crypto.randomUUID(),import_key,duplicate:Boolean(duplicate),selected:candidate.valid&&!duplicate})
 }
 return{rows,openingBalance:balance(sheets),fileName,sheets:previews,needsMapping,warning};
}
async function csvSheets(file:File):Promise<Sheet[]>{
 const arr=new Uint8Array(await file.arrayBuffer());let content:string;
 if(arr[0]===255&&arr[1]===254)content=new TextDecoder('utf-16le').decode(arr);
 else if(arr[0]===254&&arr[1]===255)content=new TextDecoder('utf-16be').decode(arr);
 else{try{content=new TextDecoder('utf-8',{fatal:true}).decode(arr)}catch{content=new TextDecoder('windows-1252').decode(arr)}}
 content=content.replace(/^\uFEFF/,'').replace(/^sep=[;,\t|]\s*\r?\n/i,'');
 const Papa=(await import('papaparse')).default;let best:Cell[][]=[],score=-Infinity,issue='';
 for(const delimiter of [file.name.toLowerCase().endsWith('.tsv')?'\t':';',',','\t','|']){
  const parsed=Papa.parse<Cell[]>(content,{delimiter,skipEmptyLines:'greedy'});
  if(parsed.errors.some(e=>e.code==='MissingQuotes'||e.code==='InvalidQuotes')){issue='Hay comillas CSV sin cerrar.';continue}
  const data=parsed.data as Cell[][],found=layout({sheet:'Movimientos',data}),rating=found.score*10+data.filter(r=>r.length>1).length/Math.max(1,data.length);
  if(rating>score){best=data;score=rating}
 }
 if(issue&&score<1)throw Error(issue);return[{sheet:'Movimientos',data:best}];
}
export async function parseFile(file:File,existing:Transaction[],account:'bank'|'cash',options:ImportOptions={}):Promise<ImportPreview>{
 if(file.size>8*1024*1024)throw Error('El archivo supera 8 MB. Divide el extracto en partes más pequeñas.');
 const ext=file.name.toLowerCase().split('.').pop();let sheets:Sheet[];
 if(ext==='xlsx'){const{default:readExcelFile}=await import('read-excel-file/browser');sheets=await readExcelFile(file) as Sheet[]}
 else if(ext==='csv'||ext==='tsv')sheets=await csvSheets(file);
 else throw Error('Usa un archivo .xlsx, .csv o .tsv.');
 const preview=await parseSheets(sheets,file.name,existing,account,options);
 if(!preview.rows.length&&!preview.sheets.length)throw Error('No encontré una tabla de movimientos. Comprueba el archivo o usa otro formato de exportación.');
 if(preview.rows.length>5000)throw Error('El archivo tiene más de 5.000 filas. Divide la importación.');
 return preview;
}
