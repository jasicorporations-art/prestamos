# Imagen con Node.js (soluciona "npm: command not found")
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
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Puerto (Railway inyecta PORT; Next.js lo lee por defecto)
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Migraciones y arranque
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
