import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

test('la primera instalación conserva los módulos de importación sin conexión',async()=>{
  const assets=['/assets/index-1.css','/assets/main-1.js','/assets/papaparse.min-1.js'];
  const handlers={},stored=new Map();
  const cache={
    put:async(key,value)=>stored.set(key,value),
    addAll:async paths=>{for(const path of paths)stored.set(path,{path})}
  };
  const caches={open:async()=>cache,match:async request=>stored.get(typeof request==='string'?request:new URL(request.url).pathname)};
  let offline=false;
  const fetch=async path=>{
    if(offline)throw Error('sin red');
    if(path==='/asset-manifest.json')return{ok:true,json:async()=>assets};
    return{ok:true,clone(){return this},text:async()=>'<html></html>'};
  };
  const self={location:{origin:'https://brujula.test'},addEventListener:(name,handler)=>{handlers[name]=handler},skipWaiting:async()=>{},clients:{claim:async()=>{}}};
  runInNewContext(await readFile('public/sw.js','utf8'),{self,caches,fetch,URL});
  let installed;
  handlers.install({waitUntil:promise=>{installed=promise}});
  await installed;
  assert.ok(stored.has('/theme-init.js'));
  assert.ok(stored.has('/asset-manifest.json'));
  const lazy=assets.find(path=>path.includes('papaparse'));
  assert.ok(stored.has(lazy));
  offline=true;
  let answer;
  handlers.fetch({request:{method:'GET',url:'https://brujula.test'+lazy,mode:'cors'},respondWith:promise=>{answer=promise}});
  assert.deepEqual(await answer,{path:lazy});
});
