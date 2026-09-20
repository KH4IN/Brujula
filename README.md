# Brújula — finanzas personales

Web instalable (PWA) adaptable a móvil y ordenador. Registra movimientos de banco y efectivo, traspasos, presupuestos, objetivos de ahorro e inversiones manuales. Muestra el reparto por categorías, el gasto diario, el patrimonio estimado y un detalle interactivo. Importa Excel `.xlsx`, CSV y TSV con revisión previa, y exporta movimientos a CSV. Cada cambio se guarda primero en el dispositivo y puede sincronizarse con Supabase mediante una cuenta. El acceso ofrece inicio de sesión por contraseña o enlace de correo y registro por enlace. Google OAuth se activará únicamente tras configurar el proveedor en Supabase y comprobarlo; consulta `supabase/AUTH_SETUP.md`. La web oficial para usar y probar Brújula es https://brujula-finanzas-gamma.vercel.app/; la rama `main` se publica allí.

## Probar en local

```bash
npm ci
npm run dev
```

Si no hay variables de Supabase, muestra datos de ejemplo en el almacenamiento local. Sin cuenta, los datos permanecen en ese navegador y no se sincronizan. Cuando configuras Supabase, las cuentas son opcionales y una cuenta nueva empieza con un espacio local vacío.

## Activar cuentas y sincronización

1. Crear un proyecto propio en Supabase.
2. Ejecutar en orden `supabase/schema.sql`, `supabase/002_tracking.sql`, `supabase/003_import_key.sql`, `supabase/004_transfers.sql` y `supabase/005_security.sql` en el editor SQL. Todas las tablas llevan RLS y políticas por usuario; la última migración retira además los permisos anónimos. `supabase/006_accounts_portfolio.sql` amplía las cuentas y los tipos de inversión. El proyecto Brújula ya tiene las seis migraciones aplicadas; en otro proyecto, ejecuta también la sexta antes de usar esta versión con sincronización.
3. Configurar autenticación según `supabase/AUTH_SETUP.md`: conservar las plantillas de enlace (`{{ .ConfirmationURL }}`), configurar la URL pública y el SMTP para admitir direcciones ajenas al equipo. El servicio de correo integrado no sirve para registro público. Google OAuth requiere configurar el cliente OAuth en Supabase; habilitar el botón después de verificarlo. Nunca publicar secretos de OAuth o SMTP en el cliente.
4. Para desarrollo, copiar `.env.example` a `.env.local` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. El despliegue desde GitHub usa `.env.production`, que incluye exclusivamente la URL y la **clave publicable** del proyecto Brújula. Esa clave ya es visible en cualquier navegador; la seguridad de los datos depende de RLS. No colocar claves secretas, credenciales SMTP ni `service_role` en archivos del repositorio o variables `VITE_`.
5. Ejecutar `npm run build` y publicar el repositorio en Vercel con el framework Vite. Después de verificar el despliegue, completar el paso 3. Para utilizar otro proyecto Supabase, actualizar `.env.production` solo con su URL y clave publicable.

Los datos se actualizan inmediatamente después de cada cambio local. Si hay una cuenta iniciada, los cambios pendientes se envían al recuperar conexión o volver a abrir la app; también hay un botón de sincronización manual. Al conectar una cuenta por primera vez se transfieren sus datos locales a ese usuario. Los datos de otras cuentas quedan separados en el mismo dispositivo. Si se edita el mismo movimiento en dos dispositivos a la vez, prevalece el último cambio enviado. No hay conexión bancaria ni cotizaciones automáticas.

### Importación

La hoja de ejemplo «Presupuesto mensual.xlsx» utiliza dos bloques en `Transacciones` para gastos e ingresos. El saldo inicial de `Resumen` nunca se suma automáticamente.

Para importar un extracto, descarga los **movimientos** en CSV, TSV o Excel desde la banca online de tu entidad y selecciona el archivo en Brújula. Se detectan cabeceras frecuentes en español, inglés, francés, alemán, portugués e italiano, con comas, punto y coma, tabuladores y codificaciones habituales. Los extractos de Revolut, BBVA, CaixaBank, Santander, Sabadell y otras entidades pueden variar según país, producto y versión: si las columnas no se reconocen, selecciona la fila de cabeceras y asigna fecha, descripción e importe (o cargo y abono) en el formulario. Revisa siempre la vista previa; cuando todos los importes sean positivos y no haya tipo, indica si son gastos o ingresos.

En un extracto con importes positivos y negativos, Brújula toma el signo: negativo es gasto y positivo es ingreso, aunque «Tipo» diga «Recibo enviado» u otra etiqueta desconocida. Si un tipo reconocido contradice al signo, bloquea la fila para revisión. Una transferencia entre cuentas propias aparece como cargo en una cuenta y abono en la otra: revísala y regístrala como **Traspaso** para que no infle las estadísticas de gastos e ingresos. No se puede deducir con certeza una transferencia propia únicamente por la descripción.

En los extractos con inicio y finalización (por ejemplo Revolut) se usa la fecha de finalización y se reconoce por separado la fecha de inicio. Los pagos pendientes, cancelados o revertidos, las divisas distintas de EUR y los importes con comisión separada distinta de cero requieren revisión y no se importan automáticamente. Una compra o venta de valores en Trade Republic tampoco se cuenta como gasto o ingreso ordinario: se registra manualmente en Inversiones. El saldo exportado no es un movimiento. Los archivos de `tests/fixtures/` son **ejemplos sintéticos**, no extractos emitidos ni certificados por esos bancos; permiten comprobar la lectura del formato y no acreditan compatibilidad con todas sus exportaciones.

Si el banco suministra una categoría se respeta; si no, se aplica una clasificación local basada en reglas. Los supermercados conocidos se identifican por marca (Mercadona, Lidl, Aldi, Día, Carrefour, Alcampo y otros) y pueden filtrarse por comercio en Movimientos. Se guardan la descripción original y la categoría; el comercio se vuelve a identificar a partir de la descripción en cada dispositivo. Los importes de otra divisa se omiten hasta que el usuario convierta el archivo a EUR; Brújula no inventa tipos de cambio. Los PDF y formatos propietarios distintos de XLSX no están soportados.

Las referencias bancarias y el número de ocurrencia ayudan a señalar duplicados; dos compras idénticas en un mismo extracto no se eliminan automáticamente. Un importe imposible, una fecha inválida o columnas de cargo y abono simultáneas bloquean la fila. Límite de 8 MB y 5.000 filas. El archivo original se lee en el navegador y no se envía al servidor; solo se sincronizan los movimientos que el usuario confirma. `npm test` ejecuta pruebas con formatos representativos sintéticos, no con extractos oficiales de todos los bancos.

### Contabilidad

En Cuentas puedes crear varios bancos con nombre y saldo inicial propios, además de efectivo; el panel suma los bancos y muestra cada saldo por separado. En Cartera puedes registrar criptomonedas, ETF, fondos y acciones con unidades y valoración manual en euros. Una inversión es un activo separado, no una cuenta para importar extractos. Si su compra ya figura como movimiento del banco, elige «Ya contabilizado en mis saldos» al registrarla para evitar descontarla dos veces; revisa el gasto importado si quieres excluir la compra de los gráficos de consumo.

El efectivo permite anotar unidades de billetes (500, 200, 100, 50, 20, 10 y 5 €) y monedas (2 y 1 €, 50, 20, 10, 5, 2 y 1 céntimo). El recuento muestra su diferencia frente al saldo que resulta de los movimientos y no se añade otra vez al patrimonio. Al guardarlo puedes elegir ajustar el saldo inicial para conciliarlo. El modo oscuro se activa desde el botón de la barra superior; el dispositivo recuerda tu elección y, al iniciar sesión, se guarda en tu cuenta de Supabase para los demás dispositivos.

- Saldo de banco/efectivo = saldo inicial + ingresos − gastos ± traspasos − coste de inversiones que se hayan marcado como financiadas desde esa cuenta.
- Un traspaso no cuenta como ingreso ni gasto.
- Patrimonio estimado = banco + efectivo + valor manual de las inversiones. La variación de precio de una inversión no es un ingreso realizado.
- Los objetivos de ahorro son cantidades reservadas dentro del dinero existente, no otro activo que se sume al patrimonio.
- Al importar un histórico, el saldo inicial que configures debe representar el dinero **anterior** a esos movimientos. Si el saldo de la hoja ya incluye los movimientos importados, no lo introduzcas como saldo inicial porque duplicaría el saldo.

Tras abrirla online, el icono y los archivos de la app se almacenan para poder arrancarla sin red. La PWA busca versiones nuevas al volver online y recargar. El almacenamiento local del navegador puede borrarse al limpiar datos de la web; antes de hacerlo, sincroniza o exporta un CSV. En algunos móviles, la versión instalada y la pestaña del navegador usan almacenes locales separados hasta que se inicia sesión y se sincronizan.

### Acceso rápido desde iPhone

En Atajos de iOS crea un atajo con la acción «URL» que contenga `https://brujula-finanzas-gamma.vercel.app/?nuevo=1&tipo=expense` y después la acción «Abrir URL». La aplicación abre el formulario de gasto para que introduzcas el importe y confirmes el guardado; también admite `tipo=income`, `importe=12.50`, `descripcion=Compra` y `categoria=Alimentación` para rellenar el formulario. Evita poner detalles financieros sensibles en la URL del atajo, ya que el navegador puede transmitir esa URL al abrir la página. No se guarda nada sin confirmarlo.

## Estructura

- `src/App.tsx`: interfaz, autenticación, gestión y panel.
- `src/data.ts`: cliente de Supabase y datos demo.
- `src/ledger.ts`: almacenamiento local, cola de cambios y conciliación con la nube.
- `src/import.ts`: lectura y validación de Excel/CSV.
- `src/categorize.ts`: reglas de comercios y categorías.
- `IMPORT_AUDIT.md`: hallazgos, pruebas y límites de la importación.
- `src/finance.ts`: cálculos de cuentas, inversiones y patrimonio.
- `public/sw.js`: caché de recursos para apertura sin conexión.
- `supabase/*.sql`: esquema, ampliaciones y políticas de acceso.

Las cantidades se guardan en EUR. Los presupuestos pertenecen a un mes concreto. Los cambios de mes permiten consultar históricos y añadir presupuestos para otro mes.

La revisión de seguridad y sus límites se describen en `SECURITY_AUDIT.md`.

## Publicar y volver atrás

La única dirección de uso y pruebas será la de producción. **Actualmente Vercel pide iniciar sesión incluso en la URL de producción.** Una persona con acceso de administración debe abrir el proyecto de Vercel → Settings → Deployment Protection y cambiar Vercel Authentication de «All Deployments» a «Standard Protection» (o desactivarla) para que el dominio de producción quede público. Mantener la autenticación de Brújula/Supabase para los datos de cada usuario. Publicar código en `main` no modifica esta protección. Antes de publicar, `npm test` y `npm run build` deben terminar bien; el workflow `.github/workflows/ci.yml` los ejecuta en las pull requests y en cada push a `main`. Conserva cada cambio en un commit y revisa la pull request antes de fusionarla. Vercel publica automáticamente la rama `main`.

El despliegue anterior de Vercel y el commit anterior de `main` permiten recuperar la interfaz. Consulta `RELEASES.md` para los commits exactos: las pull requests se fusionaron con *merge commits*, por lo que al revertir uno hay que indicar la rama principal (`git revert -m 1 <SHA>`) y hacerlo en orden inverso. Una reversión del frontend **no revierte datos ni esquema**: `006_accounts_portfolio.sql` solo añade columnas y amplía restricciones, así que puede permanecer aplicada mientras el frontend anterior sigue funcionando. No borres columnas ni movimientos para deshacer la publicación. Si se perdió contenido guardado únicamente como invitado en el navegador, GitHub y Vercel no pueden recuperarlo: expórtalo o sincronízalo antes de borrar datos del navegador.
