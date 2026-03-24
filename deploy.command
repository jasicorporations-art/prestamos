#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

chmod +x "./deploy.sh" 2>/dev/null || true
./deploy.sh

echo
echo "Presiona Enter para cerrar..."
read -r _
