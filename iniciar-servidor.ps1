# Script PowerShell para iniciar el servidor
# Ejecutar: .\iniciar-servidor.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Inversiones Nazaret Reynoso" -ForegroundColor Cyan
Write-Host " Iniciando servidor..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del script
Set-Location $PSScriptRoot

# Agregar Node.js al PATH
$env:PATH += ";C:\Program Files\nodejs"

# Verificar que Node.js existe
try {
    $nodeVersion = & "C:\Program Files\nodejs\node.exe" --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js no encontrado" -ForegroundColor Red
    Write-Host "Por favor instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "📦 Instalando dependencias (esto puede tardar unos minutos)..." -ForegroundColor Yellow
    try {
        & "C:\Program Files\nodejs\npm.cmd" install
        Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Write-Host ""
}

Write-Host ""
Write-Host "🚀 Iniciando servidor de desarrollo..." -ForegroundColor Yellow
Write-Host ""
Write-Host "El servidor se abrirá en: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para detener el servidor, presiona Ctrl+C" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar el servidor
try {
    & "C:\Program Files\nodejs\npm.cmd" run dev
} catch {
    Write-Host ""
    Write-Host "❌ Error al iniciar el servidor" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
}

