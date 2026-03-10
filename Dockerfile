FROM node:20-alpine

WORKDIR /app

# Dependencias necesarias para Prisma/OpenSSL
RUN apk add --no-cache openssl libc6-compat

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar el resto del proyecto
COPY . .

# Variables públicas para build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=https://ganrgbdkzxktuymxdmzf.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbnJnYmRrenhrdHV5bXhkbXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTU0NTksImV4cCI6MjA4MjQzMTQ1OX0.hUMI0ta9h6nbNDvwfbZIRFhGN1Rdr3Uaw8BIORL0DGM
ENV NODE_OPTIONS=--max-old-space-size=4096

# Build
RUN npm run build

# Puerto
EXPOSE 3000

# Arranque de la app
CMD ["npm", "start"]
