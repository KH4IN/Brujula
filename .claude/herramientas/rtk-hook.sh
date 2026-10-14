#!/usr/bin/env bash
# Pasa cada comando de la terminal por rtk, que resume la salida para gastar
# menos contexto. Si rtk no está instalado, no hace nada y el comando sigue igual.
if command -v rtk >/dev/null 2>&1; then
  exec rtk hook claude
elif [ -x "$HOME/.local/bin/rtk" ]; then
  exec "$HOME/.local/bin/rtk" hook claude
fi
exit 0
