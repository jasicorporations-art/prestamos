# Script para actualizar el despliegue en Vercel
# Ejecutar: .\actualizar-vercel.ps1

Write-Host "Actualizando despliegue en Vercel..." -ForegroundColor Cyan
Write-Host ""

# Agregar Node.js y Vercel al PATH
$env:PATH += ";C:\Program Files\nodejs"
$env:PATH += ";C:\Users\Owner\AppData\Roaming\npm"

# Verificar que el proyecto compila
Write-Host "1. Compilando el proyecto..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Compilacion exitosa!" -ForegroundColor Green
    Write-Host ""
    Write-Host "2. Desplegando a produccion..." -ForegroundColor Yellow
    vercel --prod
} else {
    Write-Host ""
    Write-Host "Error en la compilacion. Por favor, corrige los errores antes de desplegar." -ForegroundColor Red
}






