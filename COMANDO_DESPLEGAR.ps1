# Script para desplegar a Vercel con variables de entorno

Write-Host "🚀 Desplegando a Vercel..." -ForegroundColor Green

# Desplegar (creará un proyecto nuevo si no está vinculado)
vercel --yes

Write-Host "`n✅ Despliegue completado!" -ForegroundColor Green
Write-Host "`n📋 Ahora agrega las variables de entorno en Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "   1. Ve a: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "   2. Selecciona tu proyecto" -ForegroundColor Cyan
Write-Host "   3. Settings → Environment Variables" -ForegroundColor Cyan
Write-Host "   4. Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Cyan
Write-Host "   5. Haz un Redeploy" -ForegroundColor Cyan

