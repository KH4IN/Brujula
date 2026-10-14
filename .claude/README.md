# Herramientas del agente de Brújula

Configuración de Claude Code para quien trabaje en este repositorio. **No forma parte
de la app**: Vercel no la usa y no cambia nada en producción.

| Herramienta | Qué hace | Cómo llega |
|---|---|---|
| [rtk](https://github.com/rtk-ai/rtk) (v1.0.0) | Resume la salida de los comandos de la terminal para gastar menos contexto. Telemetría apagada. | En la nube, `herramientas/instalar.sh` lo instala al empezar la sesión (binario oficial comprobado con SHA-256). En el ordenador del fundador no se instala nada: si no está, el gancho no hace nada. |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Empuja al agente a la solución más corta que funcione (encaja con «el cambio mínimo» de `AGENTS.md`). | Se activa como plugin desde `settings.json`. |
| [Prompt Master](https://github.com/nidhinjs/prompt-master) (v1.8.2) | Redacta prompts para otras IA. Solo actúa si se le pide. | Copiado en `skills/prompt-master/` (licencia MIT). |

Las reglas de `AGENTS.md` siguen mandando sobre cualquier herramienta.

Instalar rtk a mano (Linux o macOS): ver su guía en `https://github.com/rtk-ai/rtk`.
