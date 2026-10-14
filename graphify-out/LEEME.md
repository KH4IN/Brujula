# Mapa del proyecto (graphify)

Mapa del código de Brújula hecho con [graphify](https://github.com/Graphify-Labs/graphify).
Solo es documentación: no forma parte de la app ni se publica.

| Archivo | Para qué |
|---|---|
| `graph.html` | El mapa interactivo: ábrelo en el navegador, pulsa en los nodos, filtra y busca. Carga la librería de dibujo desde unpkg.com. |
| `GRAPH_REPORT.md` | El resumen: piezas centrales, grupos y conexiones curiosas. |
| `graph.json` | Los datos del mapa, para consultarlo con `graphify query`, `path` o `explain`. |

- Hecho solo a partir del código (análisis local con tree-sitter, sin IA ni envío de
  datos a nadie). Lo que no entra está en `/.graphifyignore`.
- En `GRAPH_REPORT.md` figura el commit del que salió; si el código cambia, el mapa
  se queda viejo hasta que se rehace.
- Para rehacerlo: `uv tool install graphifyy` y, en la raíz del repo, `graphify update .`
