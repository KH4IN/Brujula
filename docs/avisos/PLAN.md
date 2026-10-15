# Avisos unificados (paso 4 de la ficha de Brújula)

Objetivo: que los avisos de Recibos y de Metas lleguen **desde Brújula**, con una sola
preferencia de hora y canal, sin duplicados y sin romper Kairós y Faro mientras sigan vivos.

## Cómo funcionan hoy

- `kairos-avisos` y `faro-avisos` son Edge Functions que `pg_cron` llama cada hora.
- Leen `kairos_ajustes` / `faro_ajustes` (hora, zona, canales) y envían:
  - **push** a los dispositivos de `kairos_dispositivos` / `faro_dispositivos`, firmando cada una con su propia clave VAPID (en Vault);
  - **correo** por Gmail (secretos de la función), con «Kairós» o «Faro» en el remitente, el asunto y el enlace.
- Una tabla `*_avisos` con clave única evita enviar dos veces el mismo aviso por el mismo canal.

## Fase 1 · En Brújula, sin servidor (hecha: B12 y B13)

- **B12** (#104): Brújula edita `kairos_ajustes` y `faro_ajustes`: hora, antelación, día y hora de la revisión, zona y correo.
- **B13** (#105): Brújula registra el móvil en `kairos_dispositivos` y `faro_dispositivos`. Como una suscripción push solo admite una clave VAPID, hay dos receptores:
  - Recibos usa el service worker principal;
  - Metas usa `/avisos-metas/sw.js`.

  Al tocar un aviso se abre Brújula.
- No se toca ni se despliega nada en el servidor.
- **Riesgo**: si alguien tiene también los avisos activos en Kairós o Faro en el mismo móvil, los recibe dos veces. La hoja lo advierte, y desaparece al llegar a la fase 3.

## Fase 2 · En el servidor (la despliegas tú; necesita tu aprobación)

1. **Textos y enlaces**: que los avisos y los correos digan «Brújula» y lleven a Brújula.
   - Lo mínimo es un cambio de texto en las dos funciones (`from`, asunto, «Abrir …») y dar a los secretos `KAIROS_URL` y `FARO_URL` el valor de la URL de Brújula.
   - Mientras Kairós y Faro sigan abiertos, sus usuarios verán «Brújula»: conviene hacerlo junto con la fase 3.
2. **Un solo correo al día**: hoy pueden llegar dos (uno de recibos y otro de la revisión).
   - Se puede dejar así.
   - O bien, juntar los envíos en una función `brujula-avisos` que reutilice `_shared/avisos.ts` de Kairós y `metas.ts` de Faro, con una sola tarea de `pg_cron`.

   **Recomiendo dejarlo así** hasta tener usuarios que lo pidan: es la opción con menos riesgo.
3. Sin cambios de tablas ni de RLS.
4. **Pruebas**: primero en «Brújula pruebas» (función desplegada allí, prueba de correo con el modo `prueba_correo` que ya existe). Después, producción.

## Fase 3 · Cerrar Kairós y Faro (paso 5 de la ficha; en sus repositorios)

1. Aviso «Kairós ahora vive dentro de Brújula» (y lo mismo en Faro), con enlace y exportación de datos.
2. Al cabo de un tiempo, redirección a Brújula.
3. Retirar el registro de dispositivos en Kairós y Faro, para que no haya duplicados.

## Qué decides tú

- Si haces la fase 2 y cuándo. Recomiendo hacerla junto con la fase 3.
- Cuánto tiempo mostrar el aviso antes de redirigir.
