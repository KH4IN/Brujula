import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFile, parseSheets, amountNumber, dateString, detectColumns } from './.import.bundle.mjs';
const file=(name,body)=>new File([body],name,{type:'text/csv'});
const parse=(name,body,existing=[],options={})=>parseFile(file(name,body),existing,'bank',options);
const tx=r=>({id:r.id,kind:r.kind,occurred_on:r.occurred_on,amount:r.amount,description:r.description,category:r.category,account:'bank',import_key:r.import_key});

test('seis extractos sintéticos: columnas, importes, categorías y exclusiones',async()=>{
 const expected={
  'revolut-ejemplo.csv':{accepted:[['2026-09-01','expense',24.95,'Alimentación'],['2026-09-06','expense',20,'Transporte']],rejected:3},
  'trade-republic-ejemplo.csv':{accepted:[['2026-09-07','expense',14.2,'Alimentación'],['2026-09-08','income',1.5,'Otros']],rejected:1},
  'bbva-ejemplo.csv':{accepted:[['2026-09-10','expense',21.35,'Alimentación'],['2026-09-12','income',1200,'Salario']],rejected:0},
  'santander-ejemplo.csv':{accepted:[['2026-09-13','expense',12.25,'Alimentación'],['2026-09-14','income',5,'Otros']],rejected:0},
  'sabadell-ejemplo.csv':{accepted:[['2026-09-15','expense',31.4,'Alimentación'],['2026-09-16','income',1400,'Salario']],rejected:0},
  'caixabank-ejemplo.csv':{accepted:[['2026-09-17','expense',9.9,'Salud'],['2026-09-18','income',30,'Otros']],rejected:0},
 };
 for(const [name,want] of Object.entries(expected)){
  const csv=readFileSync(new URL(`./fixtures/${name}`,import.meta.url));
  const preview=await parseFile(new File([csv],name),[],'bank');
  assert.equal(preview.needsMapping,false,name);
  assert.deepEqual(preview.rows.filter(row=>row.valid).map(row=>[row.occurred_on,row.kind,row.amount,row.category]),want.accepted,name);
  assert.equal(preview.rows.filter(row=>!row.valid).length,want.rejected,name);
  const existing=preview.rows.filter(row=>row.valid).map(tx);
  const repeated=await parseFile(new File([csv],name),existing,'bank');
  assert.equal(repeated.rows.filter(row=>row.valid&&!row.duplicate).length,0,`duplicados ${name}`);
 }
});

test('fecha de finalización en español prevalece sobre inicio y las comisiones se revisan',async()=>{
 const csv='Tipo;Producto;Fecha inicio;Fecha finalización;Descripción;Importe;Comisión;Divisa;Estado;Saldo\nPAGO TARJETA;Cuenta;01/09/2026;03/09/2026;MERCADONA;-10,00;0,00;EUR;COMPLETED;90,00\nPAGO TARJETA;Cuenta;04/09/2026;05/09/2026;REPSOL;-12,00;1,00;EUR;COMPLETED;78,00';
 const p=await parse('revolut-es.csv',csv);
 assert.equal(p.sheets[0].suggested.date,3);
 assert.equal(p.sheets[0].suggested.startDate,2);
 assert.equal(p.sheets[0].suggested.fee,6);
 assert.equal(p.rows[0].occurred_on,'2026-09-03');
 assert.equal(p.rows[0].valid,true);
 assert.equal(p.rows[1].valid,false);
 assert.match(p.rows[1].reason,/Comisión separada/);
});

test('un extracto mixto utiliza el signo aunque el tipo no exista o sea desconocido',async()=>{
 const csv='Fecha;Tipo;Descripción;Importe\n01/08/2026;Recibo enviado;LIDL;-12,50\n02/08/2026;Operación recibida;Venta de libro;+25,00\n03/08/2026;Sin clasificar;REPSOL;-9,00';
 const p=await parse('agosto.csv',csv);
 assert.equal(p.needsMapping,false);
 assert.deepEqual(p.rows.map(r=>[r.kind,r.amount,r.valid]),[['expense',12.5,true],['income',25,true],['expense',9,true]]);
});

test('extracto con Concepto;Fecha;Importe;Saldo y EUR pegado al importe',async()=>{
 const csv='Concepto;Fecha;Importe;Saldo\nCompra supermercado;19/09/2026;-8,00EUR;6.218,81EUR\nNómina;18/09/2026;1.400,00EUR;6.226,81EUR';
 const p=await parse('extracto.csv',csv);
 assert.equal(p.needsMapping,false);
 assert.deepEqual(p.rows.map(r=>[r.occurred_on,r.kind,r.amount,r.valid]),[['2026-09-19','expense',8,true],['2026-09-18','income',1400,true]]);
 assert.equal(p.rows[1].category,'Salario');
 assert.equal(amountNumber('-8,00EUR'),-8);
 assert.equal(amountNumber('1.400,00EUR'),1400);
 assert.equal(amountNumber('-8,00USD'),null);
});

test('el signo contrario al tipo conocido pide revisión y no falsea el saldo',async()=>{
 const p=await parse('contradiccion.csv','Fecha;Tipo;Descripción;Importe\n01/08/2026;Ingreso;Devolución;-9,00');
 assert.equal(p.rows[0].valid,false);
 assert.match(p.rows[0].reason,/signo contradice/);
});

test('separadores, preámbulo, comillas y coma decimal (BBVA/Santander/Sabadell)',async()=>{
 const p=await parse('bbva.csv','Extracto de cuenta\nFecha Operación;Concepto;Importe;Saldo\n01/09/2026;"MERCADONA, MADRID";-1.234,56;10,00\n');
 assert.equal(p.rows.length,1);assert.equal(p.rows[0].amount,1234.56);assert.equal(p.rows[0].kind,'expense');assert.equal(p.rows[0].merchant,'Mercadona');assert.equal(p.rows[0].category,'Alimentación');
});
test('Revolut: columnas inglesas, fecha ISO y tipo explícito',async()=>{
 const p=await parse('revolut.csv','Type,Date completed (UTC),Description,Amount,Fee,Currency,State\nCARD_PAYMENT,2026-09-01 13:10:00,LIDL,-24.95,0,EUR,COMPLETED');
 assert.equal(p.rows.length,1);assert.equal(p.rows[0].kind,'expense');assert.equal(p.rows[0].merchant,'Lidl');assert.equal(p.rows[0].amount,24.95);
});
test('CaixaBank: cargo/abono sin inventar el signo',async()=>{
 const p=await parse('caixa.csv','Fecha;Concepto;Cargo;Abono\n02/09/2026;ALCAMPO;38,20;\n03/09/2026;Nómina;;2100,00');
 assert.deepEqual(p.rows.map(r=>[r.kind,r.amount,r.category]),[['expense',38.2,'Alimentación'],['income',2100,'Salario']]);
});
test('N26 alemán y Wise francés representativos',async()=>{
 const de=await parse('n26.csv','Buchungstag;Verwendungszweck;Betrag\n05.09.2026;ALDI;-17,85');
 assert.equal(de.rows[0].merchant,'Aldi');
 const fr=await parse('wise.csv','Date opération;Libellé;Montant;Devise\n2026-09-04;CARREFOUR;-22,50;EUR');
 assert.equal(fr.rows[0].merchant,'Carrefour');assert.equal(fr.rows[0].valid,true);
});
test('fila positiva sin tipo exige decisión manual',async()=>{
 const data='Fecha,Descripción,Importe\n01/09/2026,Compra DIA,34.50';
 const p=await parse('banco.csv',data);assert.equal(p.needsMapping,true);
 const q=await parse('banco.csv',data,[],{sheet:'Movimientos',columns:p.sheets[0].suggested,signMode:'expenses'});
 assert.equal(q.needsMapping,false);assert.equal(q.rows[0].kind,'expense');
});
test('mapeo manual de columnas desconocidas',async()=>{
 const csv='ColA;ColB;ColC\n05/09/2026;PAGO MERCADONA;12,40';
 const first=await parse('desconocido.csv',csv);assert.equal(first.needsMapping,true);
 const mapped=await parse('desconocido.csv',csv,[],{sheet:'Movimientos',header:0,columns:{date:0,description:1,amount:2},signMode:'expenses'});
 assert.equal(mapped.rows[0].category,'Alimentación');assert.equal(mapped.rows[0].amount,12.4);
});
test('dos pagos iguales legítimos y reimportación por ocurrencia',async()=>{
 const csv='Fecha,Descripción,Importe\n2026-09-01,TPV,-10\n2026-09-01,TPV,-10';
 const first=await parse('historial.csv',csv);assert.equal(first.rows.filter(r=>r.selected).length,2);
 const second=await parse('historial.csv',csv,first.rows.map(tx));assert.equal(second.rows.filter(r=>r.duplicate).length,2);
 const partial=await parse('historial.csv',csv,[tx(first.rows[0])]);assert.deepEqual(partial.rows.map(r=>r.duplicate),[true,false]);
});
test('referencias estables por cuenta y referencia repetida en archivo',async()=>{
 const csv='Fecha;Concepto;Cargo;Referencia bancaria\n01/09/2026;Mercadona;12;ABC-9\n01/09/2026;Mercadona;12;ABC-9';
 const p=await parse('santander.csv',csv);assert.deepEqual(p.rows.map(r=>r.duplicate),[false,true]);
 const cash=await parseFile(file('santander.csv',csv),[tx(p.rows[0])],'cash');assert.equal(cash.rows[0].duplicate,false);
});
test('categoría bancaria prevalece; Bizum no se atribuye a comercio',async()=>{
 const p=await parse('mov.csv','Fecha;Concepto;Categoría;Importe\n01/09/2026;Mercadona;Personalizado;-12\n02/09/2026;Bizum a Ana;;-8');
 assert.deepEqual(p.rows.map(r=>r.category),['Personalizado','Otros']);
});
test('divisas sin conversión y filas contradictorias se descartan',async()=>{
 const p=await parse('wise.csv','Date;Description;Debit;Credit;Currency\n2026-09-01;Tesco;10;;GBP\n2026-09-02;Pago;10;11;EUR');
 assert.equal(p.rows[0].valid,false);assert.match(p.rows[0].reason,/Divisa/);assert.equal(p.rows[1].valid,false);
});
test('fecha imposible e importe vacío se detectan',async()=>{
 const p=await parse('mov.csv','Fecha;Concepto;Importe\n31/02/2026;PAGO;-10\n01/09/2026;PAGO;');
 assert.equal(p.rows.filter(r=>!r.valid).length,2);assert.equal(dateString('2026-02-31'),null);
});
test('UTF-16, UTF-8 BOM y Windows-1252',async()=>{
 const csv='Fecha;Descripción;Importe\n01/09/2026;Día supermercado;-4,10';
 const utf16=new Uint8Array([255,254,...new Uint8Array(new TextEncoder().encode(''))]);
 const bytes=Buffer.from(csv,'utf16le'),p=await parseFile(new File([utf16,bytes],'utf16.csv'),[],'bank');
 assert.equal(p.rows[0].amount,4.1);
 const bom=await parse('bom.csv','\uFEFF'+csv);assert.equal(bom.rows[0].valid,true);
 const cp=Buffer.from('Fecha;Descripci\xf3n;Importe\n01/09/2026;Aldi;-1,20','latin1');
 const legacy=await parseFile(new File([cp],'legacy.csv'),[],'bank');assert.equal(legacy.rows[0].merchant,'Aldi');
});
test('plantilla de presupuesto con dos bloques y saldo inicial',async()=>{
 const p=await parseSheets([{sheet:'Resumen',data:[['Saldo inicial',100]]},{sheet:'Transacciones',data:[[null,'Fecha','Importe','Concepto','Categoría',null,'Fecha','Importe','Concepto','Categoría'],[null,'01/09/2026',20,'ALDI',null,null,'02/09/2026',900,'Nómina',null]]}],'presupuesto.xlsx',[],'bank');
 assert.equal(p.openingBalance,100);assert.deepEqual(p.rows.map(r=>r.kind),['expense','income']);
});
test('hojas auxiliares no bloquean los movimientos del Excel',async()=>{
 const sheets=[{sheet:'Resumen',data:[['Cuenta','Saldo','Fecha'],['Banco',1200,'01/09/2026']]},{sheet:'Movimientos',data:[['Fecha','Concepto','Cargo','Abono'],['02/09/2026','Carrefour',25,null]]}];
 const result=await parseSheets(sheets,'extracto.xlsx',[],'bank');
 assert.equal(result.needsMapping,false);assert.equal(result.rows.length,1);assert.equal(result.rows[0].sheet,'Movimientos');
});
test('cantidades agrupadas, negativos contables y columnas de saldo',()=>{
 assert.equal(amountNumber('1.234,56 €'),1234.56);assert.equal(amountNumber('(1,234.56)'),-1234.56);
 assert.equal(amountNumber('1 234,56-'),-1234.56);
 const cols=detectColumns(['Fecha Valor','IBAN','Saldo','Importe (EUR)','Concepto']);
 assert.equal(cols.amount,3);assert.equal(cols.description,4);
});
