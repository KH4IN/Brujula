# Versiones de Brújula y recuperación

## Publicación del 19 de septiembre de 2026

| Referencia | Commit | Contenido |
| --- | --- | --- |
| Versión anterior | `961db36c1aaf1a5cd43d929185e6899a141e01f8` | Disponible también en `releases/production-before-2026-09-19` |
| PR #1 | `c6cc576b373467272f8318aae4923548c1e06637` | Auditoría e importadores bancarios |
| PR #3 | `8b7b82db0d0b3b683cdf91103de21cb93ce4ae56` | CSV sintéticos de seis bancos |
| PR #4 | `a9b8c8da8bc9794be1cbbc32c991dff3b43355f8` | Extractos, cuentas separadas, recuento de efectivo, modo oscuro y CI |

El despliegue de Vercel de la PR #4 está en `brujula-finanzas-jukm3kwsv-kh4ins-projects.vercel.app`, y el anterior en `brujula-finanzas-lyph34r5x-kh4ins-projects.vercel.app`. El dominio habitual es `brujula-finanzas-kh4ins-projects.vercel.app`. La protección de acceso de Vercel se configura fuera de GitHub y no cambia al revertir código.

### Revertir el frontend sin borrar historial

1. Conserva o exporta los datos de invitado que estén solo en el navegador. Para cuentas sincronizadas, confirma que los cambios pendientes se hayan enviado antes de cambiar versión.
2. Desde el `main` actual, crea una rama de recuperación y revierte **en orden inverso** las PR que quieras retirar. Para volver exactamente al código anterior a las tres PR, ejecuta:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c revert/production-2026-09-19
   git revert -m 1 a9b8c8da8bc9794be1cbbc32c991dff3b43355f8
   git revert -m 1 8b7b82db0d0b3b683cdf91103de21cb93ce4ae56
   git revert -m 1 c6cc576b373467272f8318aae4923548c1e06637
   npm ci && npm test && npm run build
   ```

3. Abre una PR desde esa rama a `main` y verifica GitHub Actions; al fusionarla, Vercel publicará una nueva versión con el historial intacto. Si el problema es solo de despliegue, el panel de Vercel permite volver a señalar el dominio al despliegue anterior, pero sincroniza GitHub después para que el siguiente push no restaure el error.

La migración `accounts_portfolio_and_cash_count` añade columnas y amplía cuentas permitidas, sin borrar tablas ni filas; déjala aplicada al volver al frontend antiguo. Git y Vercel recuperan código, **no restauran datos locales borrados ni revierten automáticamente la base de datos**. Una compra de inversión o un recuento guardado con la nueva versión podrá quedar sin interfaz en la antigua hasta recuperar esta versión.
