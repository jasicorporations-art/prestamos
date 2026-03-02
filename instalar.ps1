# Script para instalar dependencias del proyecto
# Ejecutar: .\instalar.ps1

Write-Host "🔍 Verificando Node.js..." -ForegroundColor Cyan

# Agregar Node.js al PATH si no está
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Node.js no está en el PATH. Agregando temporalmente..." -ForegroundColor Yellow
    $env:PATH += ";C:\Program Files\nodejs"
}

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instálalo desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verificar npm
try {
    $npmVersion = npm.cmd --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no está disponible" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Instalando dependencias..." -ForegroundColor Cyan
Write-Host "Esto puede tomar varios minutos. Por favor espera...`n" -ForegroundColor Yellow

# Instalar dependencias
try {
    npm.cmd install
    Write-Host "`n✅ ¡Dependencias instaladas exitosamente!" -ForegroundColor Green
    Write-Host "`n🚀 Ahora puedes ejecutar: npm.cmd run dev" -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ Error al instalar dependencias" -ForegroundColor Red
    Write-Host "Verifica tu conexión a internet y vuelve a intentar" -ForegroundColor Yellow
    exit 1
}



