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
    const name=typeof path==='string'?path:new URL(path.url).pathname;
    const kind=name==='/asset-manifest.json'?'application/json':name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html';
    return{ok:true,url:'https://brujula.test'+name,headers:{get:key=>key==='content-type'?kind:null},json:async()=>assets,clone(){return this},text:async()=>'<html></html>'};
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
  assert.equal(await answer,stored.get(lazy));
});

test('no guarda HTML como si fuese un módulo JavaScript antiguo',async()=>{
  const handlers={},stored=new Map();
  const cache={put:async(key,value)=>stored.set(key,value)};
  const caches={open:async()=>cache,match:async()=>undefined};
  const fetch=async()=>({ok:true,headers:{get:()=> 'text/html'},clone(){return this}});
  const self={location:{origin:'https://brujula.test'},addEventListener:(name,handler)=>{handlers[name]=handler}};
  runInNewContext(await readFile('public/sw.js','utf8'),{self,caches,fetch,URL});
  const request={method:'GET',url:'https://brujula.test/assets/papaparse.min-antiguo.js',mode:'cors'};
  let answer;
  handlers.fetch({request,respondWith:promise=>{answer=promise},waitUntil:()=>{}});
  await assert.rejects(answer,/módulo no está disponible/);
  assert.equal(stored.size,0);
});

test('la caché publicada cambia con el manifiesto de cada build',async()=>{
  const {mkdtemp,writeFile,readFile:read,rm,mkdir}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {execFileSync}=await import('node:child_process');
  const temp=await mkdtemp(join(tmpdir(),'brujula-sw-'));
  try{
    await mkdir(join(temp,'dist','assets'),{recursive:true});
    await writeFile(join(temp,'dist','sw.js'),await readFile('public/sw.js'));
    await writeFile(join(temp,'dist','assets','index-a.js'),'a');
    const script=new URL('../scripts/write-precache.mjs',import.meta.url).pathname;
    execFileSync(process.execPath,[script],{cwd:temp});
    const first=await read(join(temp,'dist','sw.js'),'utf8');
    assert.match(first,/brujula-shell-[0-9a-f]{12}/);
    await writeFile(join(temp,'dist','sw.js'),await readFile('public/sw.js'));
    await writeFile(join(temp,'dist','assets','index-b.js'),'b');
    execFileSync(process.execPath,[script],{cwd:temp});
    const second=await read(join(temp,'dist','sw.js'),'utf8');
    assert.notEqual(first,second);
  }finally{await rm(temp,{recursive:true,force:true})}
});
