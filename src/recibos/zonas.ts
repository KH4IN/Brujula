// Copiado de KH4IN/Kairos (2c9efb3) src/dominio/zonas.ts (idéntico en Faro). No editar aquí.
// Las ~400 zonas IANA son demasiadas para elegir en un móvil. Se ofrecen las
// habituales con nombres reconocibles y, además, la que detecta el dispositivo.

export type Zona = { id: string; nombre: string };

export const ZONAS_HABITUALES: Zona[] = [
  { id: 'Europe/Madrid', nombre: 'España (península y Baleares)' },
  { id: 'Atlantic/Canary', nombre: 'España (Canarias)' },
  { id: 'Europe/Lisbon', nombre: 'Portugal' },
  { id: 'Europe/London', nombre: 'Reino Unido e Irlanda' },
  { id: 'Europe/Paris', nombre: 'Europa central (Francia, Alemania, Italia…)' },
  { id: 'America/Mexico_City', nombre: 'México (centro)' },
  { id: 'America/Bogota', nombre: 'Colombia, Perú y Ecuador' },
  { id: 'America/Caracas', nombre: 'Venezuela' },
  { id: 'America/Santiago', nombre: 'Chile' },
  { id: 'America/Argentina/Buenos_Aires', nombre: 'Argentina y Uruguay' },
  { id: 'America/New_York', nombre: 'EE. UU. (costa este)' },
  { id: 'America/Los_Angeles', nombre: 'EE. UU. (costa oeste)' },
];

export const zonaDelDispositivo = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'; } catch { return 'Europe/Madrid'; }
};

export const zonaValida = (id: string) => {
  try { new Intl.DateTimeFormat('es-ES', { timeZone: id }); return true; } catch { return false; }
};

const ciudad = (id: string) => id.split('/').pop()!.replace(/_/g, ' ');

/** Opciones para elegir: las habituales, la del dispositivo y la ya guardada si no estaban. */
export function opcionesDeZona(guardada: string, dispositivo = zonaDelDispositivo()): Zona[] {
  const opciones = [...ZONAS_HABITUALES];
  for (const [id, etiqueta] of [[dispositivo, 'detectada en este dispositivo'], [guardada, 'guardada']] as const) {
    if (id && zonaValida(id) && !opciones.some((z) => z.id === id)) {
      opciones.unshift({ id, nombre: `${ciudad(id)} (${etiqueta})` });
    }
  }
  return opciones;
}
