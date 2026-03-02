# Desplegar este codigo en el proyecto Vercel "prestamosorigen"
# Proyecto: https://vercel.com/johns-projects-9d4c1d75/prestamosorigen
# Ejecutar desde la raiz del proyecto: .\desplegar-vercel-prestamosorigen.ps1

$ErrorActionPreference = "Stop"
$projectName = "prestamosorigen"
$vercelProjectUrl = "https://vercel.com/johns-projects-9d4c1d75/prestamosorigen"

Write-Host "=== Desplegar en Vercel: $projectName ===" -ForegroundColor Cyan
Write-Host "   $vercelProjectUrl" -ForegroundColor Gray
Write-Host ""

# 1. Quitar vinculacion anterior
Write-Host "1. Quitando vinculacion anterior (.vercel)..." -ForegroundColor Yellow
if (Test-Path .vercel) {
    Remove-Item -Recurse -Force .vercel
    Write-Host "   OK - carpeta .vercel eliminada" -ForegroundColor Green
} else {
    Write-Host "   No habia carpeta .vercel" -ForegroundColor Gray
}

# 2. Vincular al proyecto prestamosorigen (equipo johns-projects-9d4c1d75)
Write-Host ""
Write-Host "2. Vinculando a Vercel (proyecto: $projectName)..." -ForegroundColor Yellow
Write-Host "   Si pide 'Select scope': elige el equipo donde esta prestamosorigen." -ForegroundColor Gray
Write-Host "   Si pide 'Link to existing project': elige Yes y luego 'prestamosorigen'." -ForegroundColor Gray
vercel link --project $projectName
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "   Si fallo, ejecuta manualmente:" -ForegroundColor Red
    Write-Host "   vercel link --project $projectName" -ForegroundColor Red
    Write-Host "   (Elige el equipo y el proyecto prestamosorigen cuando pregunte)" -ForegroundColor Red
    exit 1
}
Write-Host "   OK - vinculado a $projectName" -ForegroundColor Green

# 3. Desplegar a produccion
Write-Host ""
Write-Host "3. Desplegando a produccion..." -ForegroundColor Yellow
vercel --prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Error en el despliegue. Revisa el mensaje anterior." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Listo ===" -ForegroundColor Green
Write-Host "Proyecto: $vercelProjectUrl" -ForegroundColor Cyan
Write-Host "Deployments y dominio: revisa en el enlace de arriba." -ForegroundColor Cyan
