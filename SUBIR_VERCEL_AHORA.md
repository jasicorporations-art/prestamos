# 🚀 Desplegar a Vercel Ahora - Instrucciones Rápidas

Ya estás autenticado en Vercel como: **jasicorporations-art**

## ⚡ Opción Rápida: Desplegar con Vercel CLI (Sin GitHub)

Puedes desplegar directamente desde la terminal:

```powershell
# Desplegar a Vercel (creará un proyecto nuevo)
vercel --yes
```

Esto te pedirá:
- Set up and deploy? → **Y** (Sí)
- Which scope? → Selecciona tu cuenta
- Link to existing project? → **N** (No, es un proyecto nuevo)
- Project name? → Presiona Enter para usar el nombre sugerido, o pon uno nuevo
- Directory? → **./** (presiona Enter)

Después del deployment, necesitarás configurar las variables de entorno en el dashboard de Vercel.

## 📋 Variables de Entorno Necesarias

Después del despliegue, ve a Vercel Dashboard y agrega estas variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Valor: `https://kpqvzkgsbawfqdsxjdjc.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng`

Para ambas variables, marca:
- ✅ Production
- ✅ Preview  
- ✅ Development

Luego haz un **Redeploy** para que las variables tomen efecto.

---

¿Quieres que lo despliegue ahora? Ejecuta: `vercel --yes`

