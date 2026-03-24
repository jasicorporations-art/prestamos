#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "DESPLIEGUE A VERCEL - PROYECTO PRESTAMOSORIGEN"
echo "https://vercel.com/johns-projects-9d4c1d75/prestamosorigen"
echo "========================================"
echo

echo "Paso 1: Desvinculando del proyecto actual..."
if [[ -d ".vercel" ]]; then
  rm -rf ".vercel"
  echo "  [OK] Carpeta .vercel eliminada"
else
  echo "  [OK] No habia vinculo previo"
fi
echo

echo "Paso 2: Limpiando cache..."
rm -rf ".next" || true
echo "  [OK] Cache limpiada"
echo

echo "Paso 3: Verificando Node y Vercel..."
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm no esta instalado. Instala Node con: brew install node"
  exit 1
fi
# Usa vercel global si existe; si no, npx (no hace falta npm install -g vercel)
vercel_cmd() {
  if command -v vercel >/dev/null 2>&1; then
    vercel "$@"
  else
    npx --yes vercel "$@"
  fi
}
if command -v vercel >/dev/null 2>&1; then
  echo "  [OK] Vercel CLI global: $(vercel --version 2>/dev/null || true)"
else
  echo "  [OK] Se usara: npx vercel (primera vez puede tardar un poco)"
  vercel_cmd --version >/dev/null 2>&1 || true
fi
echo

echo "Paso 4: Compilando proyecto..."
npm run build
echo "  [OK] Compilacion exitosa"
echo

echo "Paso 5: Vinculando al proyecto prestamosorigen..."
if ! vercel_cmd link --yes --project prestamosorigen; then
  echo
  echo "Si el proyecto prestamosorigen no existe, crealo primero en vercel.com"
  echo "Intentando vincular de forma interactiva..."
  vercel_cmd link --project prestamosorigen
fi
echo

echo "Paso 6: Desplegando a produccion (prestamosorigen)..."
if ! vercel_cmd --prod --yes --debug; then
  vercel_cmd --prod --debug
fi

echo
echo "========================================"
echo "DESPLIEGUE COMPLETADO"
echo "========================================"
echo
echo "Desplegado en: prestamosorigen (revisa la URL en Vercel)"
