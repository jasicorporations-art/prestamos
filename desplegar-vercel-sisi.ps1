# Script para desplegar a Vercel - PROYECTO SISI (NO prestamos.jasi)
# Este script despliega en el proyecto "sisi" sin afectar prestamos.jasi
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DESPLIEGUE A VERCEL - PROYECTO SISI" -ForegroundColor Cyan
Write-Host "sisi.vercel.app (NO afecta prestamos.jasi)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path package.json)) {
    Write-Host "ERROR: No se encontró package.json. Ejecuta este script desde la carpeta del proyecto." -ForegroundColor Red
    exit 1
}

# PASO 1: Desvincular del proyecto actual (prestamos.jasi)
Write-Host "Paso 1: Desvinculando del proyecto actual..." -ForegroundColor Yellow
if (Test-Path .vercel) {
    Remove-Item -Recurse -Force .vercel
    Write-Host "  ✓ Carpeta .vercel eliminada (desvinculado de prestamos.jasi)" -ForegroundColor Green
} else {
    Write-Host "  ✓ No había vínculo previo" -ForegroundColor Green
}

# PASO 2: Limpiar caché de compilación
Write-Host ""
Write-Host "Paso 2: Limpiando caché..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
}
Write-Host "  ✓ Caché limpiada" -ForegroundColor Green

# PASO 3: Verificar Vercel CLI
Write-Host ""
Write-Host "Paso 3: Verificando Vercel CLI..." -ForegroundColor Yellow
try {
    $null = & vercel --version 2>&1
    Write-Host "  ✓ Vercel CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Vercel CLI no está instalado. Ejecuta: npm install -g vercel" -ForegroundColor Red
    exit 1
}

# PASO 4: Compilar
Write-Host ""
Write-Host "Paso 4: Compilando proyecto..." -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR en la compilación" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Compilación exitosa" -ForegroundColor Green

# PASO 5: Vincular al proyecto SISI
Write-Host ""
Write-Host "Paso 5: Vinculando al proyecto sisi..." -ForegroundColor Yellow
& vercel link --yes --project sisi
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  Si el proyecto no existe, créalo primero en vercel.com" -ForegroundColor Yellow
    Write-Host "  O intenta con: vercel link (y selecciona sisi manualmente)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Intentando vincular de forma interactiva..." -ForegroundColor Cyan
    & vercel link --project sisi
}

# PASO 6: Desplegar a producción
Write-Host ""
Write-Host "Paso 6: Desplegando a producción (sisi.vercel.app)..." -ForegroundColor Yellow
& vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
    & vercel --prod
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "PROCESO COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu proyecto prestamos.jasicorporations.com NO fue modificado." -ForegroundColor Cyan
Write-Host "Los cambios se desplegaron en: sisi.vercel.app" -ForegroundColor Green
Write-Host ""
