const CACHE='brujula-shell-v4';
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);const page=await fetch('/index.html');const assets=await fetch('/asset-manifest.json').then(response=>{if(!response.ok)throw Error('Falta la lista de archivos de la aplicación.');return response.json()});await cache.put('/index.html',page);await cache.addAll(['/manifest.webmanifest','/icon.svg','/theme-init.js','/asset-manifest.json',...assets]);await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  const url=new URL(request.url);
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('/index.html',copy))}return response}).catch(()=>caches.match('/index.html')));
    return;
  }
  if(!/\.(js|css|svg|webmanifest)$/.test(url.pathname))return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response})));
});
