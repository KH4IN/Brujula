# AGENTS.md — Brújula

> Instrucciones para Codex y cualquier otro agente de código. Tienen prioridad
> sobre tus costumbres por defecto. Si una petición choca con este archivo,
> **para y pregunta al humano** antes de tocar nada.

Brújula: finanzas personales del entorno KH (movimientos, traspasos, presupuestos,
objetivos de ahorro, inversiones manuales e importación de extractos). React +
TypeScript + Vite (PWA), Supabase y Vercel. Es la **app raíz del entorno**: Kairós,
Faro y Periplo leen sus tablas.

- Producción: https://brujula-finanzas-gamma.vercel.app (rama `main`), Supabase
  `nvbkftnithuduyazhidc`.
- Staging: rama `staging`, Supabase de pruebas `xxwtwlpgnkxfufywtxpt`.
- Todo en español: código, comentarios, interfaz, commits y documentación.

## 1. Alcance: qué puedes cambiar

Brújula está **en producción con datos financieros reales** y va a pasar una
**auditoría de seguridad crítica y profunda**. Hasta nuevo aviso solo se aceptan:

1. **Fallos que se ven en la interfaz**: textos cortados o desbordados, solapes,
   contraste, botones que no responden, pantallas en blanco, errores de consola que
   rompen algo, problemas en móvil (360–430 px) o en cualquiera de los temas
   («Rumbo», antiguo/Ultra y el clásico oculto).
2. **Fallos graves**: importes o saldos mal calculados, movimientos perdidos o
   duplicados al sincronizar o importar, datos de un usuario visibles para otro,
   caídas, vulnerabilidades.

**No hagas** (proponlo por escrito en la PR, sin implementarlo): refactors,
renombrados, cambios de diseño o de textos que no sean un fallo, dependencias
nuevas o actualizaciones, cambios de arquitectura, formateo masivo, borrar código.

Cómo corregir:
- El cambio **mínimo**; un fallo por commit, explicando qué se veía mal y por qué.
- Si el fallo es de lógica (cálculo, importación, sincronización), añade una prueba
  en `tests/` que falle antes y pase después.
- Antes de cada push: `npm test` y `npm run build`.
- Rama propia y PR. **Nunca** push directo a `main` ni a `staging`.

## 2. Zonas intocables

Sin aprobación humana explícita en la propia petición, no modifiques:

- **Ramas `main` y `staging` son distintas a propósito.** Nunca copies de `staging`
  a `main` estos archivos: `.env.production`, `vercel.json`, `src/data.ts`,
  `src/features/Auth.tsx` (apuntan a proyectos de Supabase distintos). Al llevar un
  cambio de una rama a otra, lleva solo ese cambio.
- `supabase/schema.sql` y `supabase/00*_*.sql`: aplicadas en producción. **Nunca
  edites una migración existente**; si hace falta, crea `007_…sql` y déjala sin
  aplicar para revisión humana.
- `src/auth.ts`, `src/features/Auth.tsx`, `supabase/AUTH_SETUP.md`,
  `supabase/email-otp.html`: registro, acceso por contraseña, enlace y código, OAuth.
- `src/data.ts`: configuración de Supabase y sincronización local-primero
  (fusión de cambios, datos de invitado, cola pendiente).
- `src/finance.ts`, `src/ledger.ts`, `src/cash.ts`: cálculos de dinero. Solo
  correcciones de fallos graves, con prueba.
- `src/import.ts` y `src/categorize.ts`: lectura de archivos no confiables (xlsx,
  CSV, TSV). No relajes validaciones ni límites de tamaño.
- `vercel.json` (CSP y cabeceras de seguridad), `.env.production`, `.env.example`,
  `public/sw.js`, `.github/workflows/*`, `package.json`, `package-lock.json`.
- `SECURITY_AUDIT.md`, `BACKUPS.md`, `IMPORT_AUDIT.md`: historial de auditorías;
  se amplían, no se reescriben.

### Contrato con las otras apps del entorno (no romper)

Otras apps leen tablas de Brújula con la sesión del usuario y el RLS de Brújula:

| Tabla | Columnas que se leen | Quién |
|---|---|---|
| `public.transactions` | `id, amount, kind, category, description, occurred_on` | Kairós, Periplo |
| `public.goals` | `id, name, target_amount, saved_amount, due_on` | Faro |

No renombres, quites ni cambies el tipo o el significado de esas columnas, y no
cambies sus políticas de lectura (cada usuario lee solo lo suyo). Brújula **nunca**
escribe en tablas de otras apps (`kairos_*`, `faro_*`, `bitacora_*`, `periplo_*`),
y las otras apps nunca escriben en las de Brújula.

## 3. Invariantes de seguridad (la auditoría las comprobará)

- **Secretos**: `service_role`, credenciales SMTP y de OAuth solo en Supabase o en
  secretos del servidor. Nunca en `VITE_*`, en el repo, en logs, issues ni PRs.
- **RLS** en todas las tablas, políticas por `user_id`, sin acceso anónimo
  (`005_security.sql`). No desactives RLS ni añadas políticas `using (true)`.
- **Datos financieros**: no se envían a terceros, ni analítica, ni registros con
  importes o descripciones. No hay conexión bancaria.
- **Nada de puertas traseras** ni banderas que salten comprobaciones.
- **Producción**: no despliegues, no ejecutes SQL contra producción, no toques la
  configuración de Supabase Auth, Vercel ni Google OAuth. Eso lo hace el humano.

### Lo que es público por diseño (no es un hallazgo)

- La URL de Supabase y la clave *publishable* en el bundle (la seguridad depende de RLS).
- En el proyecto compartido, las funciones `*_vapid_publica()` de las otras apps y
  sus tablas `*_avisos` con RLS sin políticas (solo las usa `service_role`).
- `pg_net` en `public` y la protección de contraseñas filtradas desactivada:
  configuración del proyecto, decisión del humano.

## 4. Cobros y plan premium (si te lo piden)

Es posible que se pida **planificar o implementar un cobro** por un servicio más
avanzado. Reglas:

1. **Primero el plan**: propuesta en `docs/premium/PLAN.md` del repositorio
   `KH4IN/Ideas-de-aplicaciones-de-entorno-kh` (el encargo común está en
   `docs/premium/ENCARGO.md`) (qué es gratis y qué premium,
   proveedor, precios, IVA, reembolsos, cancelación, pagos fallidos) y espera
   aprobación humana. Precios y textos legales los decide el humano.
2. **Pasarela alojada con redirección** (p. ej. Stripe Checkout y portal de
   cliente). La app no ve ni guarda datos de tarjeta. Nada de formularios de pago
   incrustados.
3. **El servidor manda**: el derecho a premium vive en una tabla que solo escribe
   el servidor (`service_role` desde una Edge Function), p. ej. una única tabla común
   del entorno KH (`kh_suscripciones`), legible solo por su dueño. Nunca en
   `localStorage`, `user_metadata` ni el bundle.
4. **Webhooks** con firma verificada, idempotentes (id de evento guardado) y sin
   confiar en datos del cliente. Secretos del proveedor solo en la función.
5. **Límites en la base** (RLS/funciones), no solo ocultando botones.
6. **Modo de prueba en staging/previews**, claves reales solo en producción.
7. Con redirección no hace falta tocar la CSP ni `Permissions-Policy: payment=()`.
   Si fuera imprescindible, solo los orígenes exactos del proveedor, justificado.
8. **Nunca** se cobra por acceder a los propios datos: quien no pague conserva sus
   movimientos y puede exportarlos a CSV.

## 5. Cómo trabajar aquí

- `npm ci`, `npm test`, `npm run build`.
- Lee `README.md`, `ARCHITECTURE.md`, `SECURITY_AUDIT.md` y `TEMAS.md` antes de cambiar nada.
- No reescribas historia (`push --force`, `rebase` de ramas ajenas).
- Ante la duda entre «arreglar» y «mejorar», **no lo hagas y pregunta**.
