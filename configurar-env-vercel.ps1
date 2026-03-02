# Script para configurar variables de entorno en Vercel
# Ejecutar: .\configurar-env-vercel.ps1

Write-Host "Configurando variables de entorno en Vercel..." -ForegroundColor Cyan
Write-Host ""

$env:PATH += ";C:\Users\Owner\AppData\Roaming\npm"

# URL de Supabase
$supabaseUrl = "https://ganrgbdkzxktuymxdmzf.supabase.co"

Write-Host "Agregando NEXT_PUBLIC_SUPABASE_URL..." -ForegroundColor Yellow
Write-Host "Valor: $supabaseUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "Cuando se te solicite, selecciona todos los entornos (Production, Preview, Development)" -ForegroundColor Cyan
Write-Host "Presiona Enter para continuar..."
Read-Host

vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development

Write-Host ""
Write-Host "Ahora necesitas agregar tu clave anonima de Supabase." -ForegroundColor Yellow
Write-Host "Puedes obtenerla desde: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf/settings/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Enter cuando estes listo para agregar NEXT_PUBLIC_SUPABASE_ANON_KEY..."
Read-Host

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development

Write-Host ""
Write-Host "Variables de entorno configuradas!" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes desplegar con: vercel --prod" -ForegroundColor Cyan






