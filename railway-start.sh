#!/bin/sh
set -e
# Logs visibles: primero este marcador, luego Next.js. Prisma en background sin llenar el log.
echo ""
echo "======== NEXT.JS STARTING (PORT=${PORT:-3000}) ========"
echo ""

# Prisma migrate deploy desactivado: Supabase :5432 no alcanzable desde Railway (usa pooler :6543 o migra a mano)
# (npx prisma migrate deploy >/dev/null 2>&1 || true) &

# Next.js en primer plano (Railway necesita que escuche en $PORT)
exec npm run start 2>&1
