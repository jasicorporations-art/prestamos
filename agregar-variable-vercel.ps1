# Script para agregar la variable NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel
# Ejecutar: .\agregar-variable-vercel.ps1

Write-Host "🔑 Agregar Variable de Entorno en Vercel" -ForegroundColor Cyan
Write-Host ""

# Verificar que vercel está instalado
$vercelPath = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelPath) {
    Write-Host "❌ Vercel CLI no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Ejecuta: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Instrucciones para agregar la variable:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ejecuta el siguiente comando:" -ForegroundColor White
Write-Host "   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Green
Write-Host ""
Write-Host "2. Cuando te pregunte el valor, pega tu clave anónima de Supabase" -ForegroundColor White
Write-Host "   (La puedes obtener de: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf/settings/api)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Cuando te pregunte los entornos, selecciona:" -ForegroundColor White
Write-Host "   - Development (d)" -ForegroundColor Green
Write-Host "   - Preview (p)" -ForegroundColor Green
Write-Host "   - Production (P)" -ForegroundColor Green
Write-Host ""
Write-Host "4. Después de agregar, vuelve a desplegar:" -ForegroundColor White
Write-Host "   vercel --prod" -ForegroundColor Green
Write-Host ""

$continuar = Read-Host "¿Quieres ejecutar el comando ahora? (S/N)"
if ($continuar -eq "S" -or $continuar -eq "s") {
    Write-Host ""
    Write-Host "Ejecutando: vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Cyan
    Write-Host ""
    
    $env:PATH += ";C:\Users\Owner\AppData\Roaming\npm"
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
} else {
    Write-Host "Puedes ejecutar el comando manualmente cuando estés listo." -ForegroundColor Yellow
}





