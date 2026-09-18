# Brújula — finanzas personales

Web instalable (PWA) adaptable a móvil y ordenador. Registra movimientos de banco y efectivo, traspasos, presupuestos, objetivos de ahorro e inversiones manuales. Muestra el reparto por categorías, el gasto diario, el patrimonio estimado y un detalle interactivo. Importa Excel `.xlsx`, CSV y TSV con revisión previa, y exporta movimientos a CSV. Cada cambio se guarda primero en el dispositivo y puede sincronizarse con Supabase mediante una cuenta. Para acceder, se solicita un código de seis cifras por correo, sin contraseña.

## Probar en local

```bash
npm ci
npm run dev
```

Si no hay variables de Supabase, muestra datos de ejemplo en el almacenamiento local. Sin cuenta, los datos permanecen en ese navegador y no se sincronizan. Cuando configuras Supabase, las cuentas son opcionales y una cuenta nueva empieza con un espacio local vacío.

## Activar cuentas y sincronización

1. Crear un proyecto propio en Supabase.
2. Ejecutar en orden `supabase/schema.sql`, `supabase/002_tracking.sql`, `supabase/003_import_key.sql`, `supabase/004_transfers.sql` y `supabase/005_security.sql` en el editor SQL. Todas las tablas llevan RLS y políticas por usuario; la última migración retira además los permisos anónimos. El proyecto Brújula ya tiene estas migraciones aplicadas.
3. Configurar acceso por email OTP según `supabase/OTP_SETUP.md`. **Primero publicar el nuevo frontend**, después sustituir las plantillas de confirmación y de Magic Link/OTP por la plantilla con `{{ .Token }}`. Mantener la confirmación por correo y configurar la URL pública. Para que funcione con cualquier dirección se necesita SMTP propio: el servicio integrado solo envía a direcciones autorizadas del proyecto y limita actualmente el proyecto a 2 correos por hora. Nunca publicar credenciales SMTP en el cliente.
4. Para desarrollo, copiar `.env.example` a `.env.local` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. El despliegue desde GitHub usa `.env.production`, que incluye exclusivamente la URL y la **clave publicable** del proyecto Brújula. Esa clave ya es visible en cualquier navegador; la seguridad de los datos depende de RLS. No colocar claves secretas, credenciales SMTP ni `service_role` en archivos del repositorio o variables `VITE_`.
5. Ejecutar `npm run build` y publicar el repositorio en Vercel con el framework Vite. Después de verificar el despliegue, completar el paso 3. Para utilizar otro proyecto Supabase, actualizar `.env.production` solo con su URL y clave publicable.

Los datos se actualizan inmediatamente después de cada cambio local. Si hay una cuenta iniciada, los cambios pendientes se envían al recuperar conexión o volver a abrir la app; también hay un botón de sincronización manual. Al conectar una cuenta por primera vez se transfieren sus datos locales a ese usuario. Los datos de otras cuentas quedan separados en el mismo dispositivo. Si se edita el mismo movimiento en dos dispositivos a la vez, prevalece el último cambio enviado. No hay conexión bancaria ni cotizaciones automáticas.

### Importación

La hoja de ejemplo «Presupuesto mensual.xlsx» utiliza dos bloques en `Transacciones`: columnas B–E para gastos y G–J para ganancias. La app los reconoce y preserva fecha, importe, descripción y categoría. Omite filas con fecha inválida o importe cero después de redondear a céntimos, muestra posibles duplicados, y pide confirmar la selección. La hoja `Resumen` puede indicar un saldo inicial, pero nunca se importa automáticamente como ingreso. En CSV/TSV admite encabezados como Fecha, Importe, Descripción, Categoría y Tipo; si falta Tipo, infiere ingreso/gasto del signo y conviene revisar la vista previa. Límite de 8 MB y 5.000 filas. El archivo original no se sube: solo se guardan los movimientos confirmados. Las claves de importación distinguen banco de efectivo.

### Contabilidad

- Saldo de banco/efectivo = saldo inicial + ingresos − gastos ± traspasos − coste de inversiones que se hayan marcado como financiadas desde esa cuenta.
- Un traspaso no cuenta como ingreso ni gasto.
- Patrimonio estimado = banco + efectivo + valor manual de las inversiones. La variación de precio de una inversión no es un ingreso realizado.
- Los objetivos de ahorro son cantidades reservadas dentro del dinero existente, no otro activo que se sume al patrimonio.
- Al importar un histórico, el saldo inicial que configures debe representar el dinero **anterior** a esos movimientos. Si el saldo de la hoja ya incluye los movimientos importados, no lo introduzcas como saldo inicial porque duplicaría el saldo.

Tras abrirla online, el icono y los archivos de la app se almacenan para poder arrancarla sin red. La PWA busca versiones nuevas al volver online y recargar. El almacenamiento local del navegador puede borrarse al limpiar datos de la web; antes de hacerlo, sincroniza o exporta un CSV. En algunos móviles, la versión instalada y la pestaña del navegador usan almacenes locales separados hasta que se inicia sesión y se sincronizan.

## Estructura

- `src/App.tsx`: interfaz, autenticación, gestión y panel.
- `src/data.ts`: cliente de Supabase y datos demo.
- `src/ledger.ts`: almacenamiento local, cola de cambios y conciliación con la nube.
- `src/import.ts`: lectura y validación de Excel/CSV.
- `src/finance.ts`: cálculos de cuentas, inversiones y patrimonio.
- `public/sw.js`: caché de recursos para apertura sin conexión.
- `supabase/*.sql`: esquema, ampliaciones y políticas de acceso.

Las cantidades se guardan en EUR. Los presupuestos pertenecen a un mes concreto. Los cambios de mes permiten consultar históricos y añadir presupuestos para otro mes.

La revisión de seguridad y sus límites se describen en `SECURITY_AUDIT.md`.
