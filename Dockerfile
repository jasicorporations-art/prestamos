# prestamo - Railway (si ves "Dockerfile:21" en error, este archivo no es el que usa Railway; sube este con git push)
FROM node:20-alpine

# OpenSSL para Prisma (evita "Prisma failed to detect the libssl/openssl version")
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependencias (incluye dev para el build)
RUN npm ci

# Copiar el resto del proyecto
COPY . .

# Build (prisma generate + next build)
# Pon aqui tu URL y anon key de Supabase (para que el build y el cliente funcionen).
# NUNCA pongas SUPABASE_SERVICE_ROLE_KEY aqui; esa clave dejala solo en Railway -> Variables.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=https://ganrgbdkzxktuymxdmzf.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbnJnYmRrenhrdHV5bXhkbXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTU0NTksImV4cCI6MjA4MjQzMTQ1OX0.hUMI0ta9h6nbNDvwfbZIRFhGN1Rdr3Uaw8BIORL0DGM
ENV NODE_OPTIONS=--max-old-space-size=4096
# Mostrar el error completo si falla (en Railway sube en Build Logs para verlo)
RUN npm run build 2>&1 || (echo ">>> BUILD FAILED - revisa las lineas de arriba <<<" && exit 1)

# Puerto (Railway inyecta PORT; Next.js lo lee por defecto)
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Arranque (sin migrate deploy: Supabase :5432 suele no ser accesible desde Railway; ejecuta migraciones a mano o usa DATABASE_URL con pooler :6543 si las necesitas al inicio)
CMD ["npm", "start"]
