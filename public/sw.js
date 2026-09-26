const CACHE='brujula-shell-__ASSET_MANIFEST_VERSION__';
const validAsset=(url,response)=>response.ok&&(!/\.(js|css)$/.test(url)||response.headers.get('content-type')?.includes(url.endsWith('.js')?'javascript':'text/css'));
self.addEventListener('install',event=>{event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const page=await fetch('/index.html',{cache:'no-store'});
  if(!page.ok||!page.headers.get('content-type')?.includes('text/html')||new URL(page.url,self.location.origin).origin!==self.location.origin)throw Error('No se pudo instalar la página.');
  const manifest=await fetch('/asset-manifest.json',{cache:'no-store'});
  if(!manifest.ok)throw Error('Falta la lista de archivos de la aplicación.');
  const assets=await manifest.clone().json();
  await Promise.all(assets.map(async url=>{
    const response=await fetch(url);
    if(!validAsset(url,response))throw Error('Falta un módulo de la aplicación: '+url);
    await cache.put(url,response);
  }));
  await cache.put('/index.html',page);
  await cache.put('/asset-manifest.json',manifest);
  await cache.addAll(['/manifest.webmanifest','/icon.svg','/theme-init.js']);
  await self.skipWaiting();
})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const keys=await caches.keys();
  const previous=keys.filter(key=>key.startsWith('brujula-shell-')&&key!==CACHE);
  await Promise.all(previous.slice(0,-1).map(key=>caches.delete(key)));
  await self.clients.claim();
})())});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  const url=new URL(request.url);
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('/index.html',copy))}return response}).catch(()=>caches.match('/index.html')));
    return;
  }
  if(!/\.(js|css|svg|webmanifest)$/.test(url.pathname))return;
  event.respondWith(caches.match(request).then(async cached=>{
    if(cached&&validAsset(url.pathname,cached))return cached;
    const response=await fetch(request);
    if(!validAsset(url.pathname,response))throw Error('El módulo no está disponible. Recarga la página.');
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
    return response;
  }));
});
