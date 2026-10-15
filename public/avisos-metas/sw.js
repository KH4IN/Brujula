// Avisos de Metas: los envía la función de avisos de Faro, que firma con su propia clave.
// Una suscripción push solo admite una clave, así que Metas tiene su propio service worker
// (ámbito /avisos-metas/, no controla ninguna página) y Recibos usa el principal (/sw.js).
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let datos={};
  try{datos=event.data?event.data.json():{}}catch{datos={cuerpo:event.data?.text()}}
  event.waitUntil(self.registration.showNotification(datos.titulo||'Brújula',{body:datos.cuerpo||'Tienes un aviso.',icon:'/icon.svg',badge:'/icon.svg',tag:datos.clave||undefined}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const ventanas=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const abierta=ventanas.find(v=>v.url.startsWith(self.location.origin));
    return abierta?abierta.focus():self.clients.openWindow('/');
  })());
});
