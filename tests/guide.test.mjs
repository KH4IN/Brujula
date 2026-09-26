import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_STEPS, initialGuideProgress, validGuideProgress} from './.guide.bundle.mjs';
function storage(){const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};return values}
test('la guía conserva por cuenta los puntos vistos tras volver a abrirla',()=>{
  storage();const seen=GUIDE_STEPS.slice(0,4).map(s=>s.id);
  localStorage.setItem('brujula.guide.v2.cuenta-uno',JSON.stringify({index:4,visited:seen}));
  assert.deepEqual(initialGuideProgress('cuenta-uno',null),{index:4,visited:seen,completed:false});
  assert.deepEqual(initialGuideProgress('cuenta-dos',null),{index:0,visited:[]});
});
test('combina progreso local y de cuenta sin repetir puntos vistos',()=>{
  storage();localStorage.setItem('brujula.guide.v2.usuario',JSON.stringify({index:2,visited:['home','paths']}));
  assert.deepEqual(initialGuideProgress('usuario',{index:3,visited:['accounts']}),{index:3,visited:['home','paths','accounts'],completed:false});
});
test('descarta progreso inválido y preserva solo identificadores conocidos',()=>{
  storage();assert.equal(validGuideProgress({index:999,visited:[]}),null);
  assert.deepEqual(validGuideProgress({index:0,visited:['home','home','desconocido']}),{index:0,visited:['home'],completed:false});
});
