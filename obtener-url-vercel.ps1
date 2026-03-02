# Script para obtener la URL del proyecto en Vercel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OBTENER URL DEL PROYECTO EN VERCEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Vercel CLI esté instalado
Write-Host "Verificando Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = & vercel --version 2>&1
    Write-Host "✓ Vercel CLI encontrado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Vercel CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala Vercel CLI con: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Listando proyectos en Vercel..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Agregar npm al PATH si es necesario
$env:PATH += ";C:\Users\Owner\AppData\Roaming\npm"

# Listar proyectos
& vercel ls

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INFORMACION ADICIONAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si quieres ver más detalles de un proyecto específico:" -ForegroundColor Yellow
Write-Host "1. Ve a: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "2. Haz clic en el proyecto que quieres" -ForegroundColor Cyan
Write-Host "3. Verás la URL en la parte superior" -ForegroundColor Cyan
Write-Host ""
Write-Host "O ejecuta: vercel inspect" -ForegroundColor Yellow
Write-Host ""
