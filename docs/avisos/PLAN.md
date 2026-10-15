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

## Fase 2 · En el servidor (aprobada el 16-10; PR abiertas, la despliegas tú)

1. **Textos y enlaces**: que los avisos y los correos digan «Brújula» y lleven a Brújula.
   - Lo mínimo es un cambio de texto en las dos funciones (`from`, asunto, «Abrir …») y dar a los secretos `KAIROS_URL` y `FARO_URL` el valor de la URL de Brújula.
   - Mientras Kairós y Faro sigan abiertos, sus usuarios verán «Brújula»: conviene hacerlo junto con la fase 3.
2. **Un solo correo al día**: hoy pueden llegar dos (uno de recibos y otro de la revisión).
   - Se puede dejar así.
   - O bien, juntar los envíos en una función `brujula-avisos` que reutilice `_shared/avisos.ts` de Kairós y `metas.ts` de Faro, con una sola tarea de `pg_cron`.

   **Recomiendo dejarlo así** hasta tener usuarios que lo pidan: es la opción con menos riesgo.
3. Sin cambios de tablas ni de RLS.
4. **Pruebas**: primero en «Brújula pruebas» (función desplegada allí, prueba de correo con el modo `prueba_correo` que ya existe). Después, producción.

## Fase 3 · Cerrar Kairós y Faro (aprobada el 16-10; PR abiertas)

1. Aviso «Kairós ahora vive dentro de Brújula» (y lo mismo en Faro), con enlace y exportación de datos.
2. Al cabo de un tiempo, redirección a Brújula.
3. Retirar el registro de dispositivos en Kairós y Faro, para que no haya duplicados.

## Estado (16-10)

| Qué | Kairós | Faro |
|---|---|---|
| Fase 2: los avisos dicen «Brújula» y llevan a Brújula | [kairos#5](https://github.com/KH4IN/kairos/pull/5) | [faro#4](https://github.com/KH4IN/faro/pull/4) |
| Fase 3a: franja «ahora vive en Brújula» y «Descargar mis datos» | [kairos#6](https://github.com/KH4IN/kairos/pull/6) | [faro#5](https://github.com/KH4IN/faro/pull/5) |
| Fase 3b: redirección a Brújula (borrador) | [kairos#7](https://github.com/KH4IN/kairos/pull/7) | [faro#6](https://github.com/KH4IN/faro/pull/6) |

Decisiones tomadas al hacerlo:
- **Un correo por app**: se queda así, sin función `brujula-avisos`. Es lo recomendado arriba.
- **Registro de dispositivos en Kairós y Faro**: no se toca `push.ts`. Con la redirección ya no se puede abrir Ajustes, así que no entran móviles nuevos. Los que ya estaban siguen recibiendo los avisos, y al tocarlos se abre Brújula.
- **Tiempo de aviso antes de redirigir**: no lo dijiste, así que propongo **4 semanas**. Por eso la redirección está en borrador: la unes cuando quieras.

## Orden para desplegar (lo haces tú)

1. Pasar Brújula de `staging` a `main` y publicarla: Recibos y Metas tienen que existir en producción.
2. Secretos `KAIROS_URL` y `FARO_URL`: si existen, bórralos o ponles la URL de Brújula.
3. Desplegar las funciones con la fase 2, primero en «Brújula pruebas» y después en producción.
4. Desplegar Kairós y Faro con la franja (fase 3a).
5. Al cabo de unas 4 semanas, unir y desplegar la redirección (fase 3b).
