// Avisos en el móvil desde Brújula, sin tocar el servidor: el dispositivo se registra en
// kairos_dispositivos y faro_dispositivos, de donde ya leen las funciones de avisos.
// Cada función firma con su clave VAPID; como una suscripción solo admite una clave,
// Recibos usa el service worker principal y Metas uno propio en /avisos-metas/.
import { supabase } from '../data';

export const pushDisponible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const esIOSSinInstalar = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

const aBytes = (base64: string) => {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

type Destino = { tabla: 'kairos_dispositivos' | 'faro_dispositivos'; clave: 'kairos_vapid_publica' | 'faro_vapid_publica'; registro: () => Promise<ServiceWorkerRegistration> };
const RECIBOS: Destino = { tabla: 'kairos_dispositivos', clave: 'kairos_vapid_publica', registro: () => navigator.serviceWorker.ready };
const METAS: Destino = { tabla: 'faro_dispositivos', clave: 'faro_vapid_publica', registro: async () => {
  const r = await navigator.serviceWorker.register('/avisos-metas/sw.js', { scope: '/avisos-metas/' });
  if (!r.active) await new Promise<void>((listo) => { const w = r.installing ?? r.waiting; w?.addEventListener('statechange', () => { if (w.state === 'activated') listo(); }); if (!w) listo(); });
  return r;
} };

async function suscribir(d: Destino, usuario: string) {
  const { data: clave } = await supabase!.rpc(d.clave);
  if (typeof clave !== 'string' || !clave) throw new Error('Los avisos en el móvil aún no están listos en el servidor. Prueba de nuevo en una hora.');
  const r = await d.registro();
  const s = (await r.pushManager.getSubscription()) ?? await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clave) })
    .catch(() => { throw new Error('Este navegador no dejó activar los avisos. Revisa el permiso de notificaciones de Brújula y prueba de nuevo.'); });
  const { endpoint, keys } = s.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase!.from(d.tabla).upsert({ user_id: usuario, endpoint, p256dh: keys.p256dh, auth: keys.auth, agente: navigator.userAgent.slice(0, 200) }, { onConflict: 'endpoint' });
  if (error) throw new Error('No se pudo registrar este dispositivo. Prueba de nuevo en un momento.');
}

/** Pide permiso (al pulsar un botón) y registra este dispositivo para los módulos activos. */
export async function activarPush(usuario: string, recibos: boolean, metas: boolean) {
  if (!supabase || !pushDisponible()) throw new Error('Este navegador no admite avisos en el móvil.');
  if (esIOSSinInstalar()) throw new Error('En iPhone, primero añade Brújula a la pantalla de inicio y ábrela desde allí.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('No se concedió el permiso de notificaciones.');
  if (recibos) await suscribir(RECIBOS, usuario);
  if (metas) await suscribir(METAS, usuario);
}

export async function desactivarPush() {
  if (!supabase || !pushDisponible()) return;
  for (const d of [RECIBOS, METAS]) {
    const r = d === RECIBOS ? await navigator.serviceWorker.getRegistration('/') : await navigator.serviceWorker.getRegistration('/avisos-metas/');
    const s = await r?.pushManager.getSubscription();
    if (!s) continue;
    await supabase.from(d.tabla).delete().eq('endpoint', s.endpoint);
    await s.unsubscribe();
  }
}
