#!/usr/bin/env bash
# Instala rtk al empezar una sesión de Claude Code en la nube. En el ordenador
# del fundador no instala nada: solo avisa. Nunca falla: si no se puede
# instalar, la sesión sigue igual. Nada de esto forma parte de la app.

RTK_VERSION="v1.0.0"
BIN="$HOME/.local/bin"

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  command -v rtk >/dev/null 2>&1 || echo "Brújula: rtk no está instalado en este equipo (ver .claude/README.md)." >&2
  exit 0
fi

if command -v rtk >/dev/null 2>&1 || [ -x "$BIN/rtk" ]; then exit 0; fi

case "$(uname -m)" in
  x86_64) objetivo="x86_64-unknown-linux-musl" ;;
  aarch64) objetivo="aarch64-unknown-linux-gnu" ;;
  *) exit 0 ;;
esac

tmp="$(mktemp -d)"
base="https://github.com/rtk-ai/rtk/releases/download/$RTK_VERSION"
archivo="rtk-$objetivo.tar.gz"
# Binario oficial de GitHub, comprobado con su suma SHA-256 antes de instalarlo.
if curl -fsSL "$base/$archivo" -o "$tmp/$archivo" && curl -fsSL "$base/checksums.txt" -o "$tmp/checksums.txt"; then
  esperado="$(grep " $archivo\$" "$tmp/checksums.txt" | awk '{print $1}')"
  real="$(sha256sum "$tmp/$archivo" | awk '{print $1}')"
  if [ -n "$esperado" ] && [ "$esperado" = "$real" ]; then
    mkdir -p "$BIN" && tar -xzf "$tmp/$archivo" -C "$tmp" && install -m 755 "$tmp/rtk" "$BIN/rtk"
  fi
fi
rm -rf "$tmp"
exit 0
