# Script para crear el archivo .env.local
# Ejecutar: .\crear-env-local.ps1

Write-Host "🔧 Configuración de .env.local para JASICORPORATIONS GESTION DE PRESTAMOS" -ForegroundColor Cyan
Write-Host ""

# Pedir la URL de Supabase
Write-Host "Por favor, ingresa la URL de tu proyecto de Supabase:" -ForegroundColor Yellow
Write-Host "(La puedes encontrar en Settings > API > Project URL)" -ForegroundColor Gray
Write-Host "Ejemplo: https://xxxxxxxxxxxxx.supabase.co" -ForegroundColor Gray
Write-Host ""
$supabaseUrl = Read-Host "URL de Supabase"

if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    Write-Host "❌ No se ingresó la URL. Saliendo..." -ForegroundColor Red
    exit 1
}

# Validar que la URL parece válida
if (-not $supabaseUrl.StartsWith("https://") -or -not $supabaseUrl.Contains(".supabase.co")) {
    Write-Host "⚠️  Advertencia: La URL debe ser de Supabase (ejemplo: https://xxxxx.supabase.co)" -ForegroundColor Yellow
    $continuar = Read-Host "¿Continuar de todos modos? (S/N)"
    if ($continuar -ne "S" -and $continuar -ne "s") {
        exit 1
    }
}

Write-Host ""
Write-Host "URL de Supabase: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Pedir la clave anónima
Write-Host "Por favor, ingresa tu clave 'anon public' de Supabase:" -ForegroundColor Yellow
Write-Host "(La puedes encontrar en Settings > API > anon public)" -ForegroundColor Gray
Write-Host ""
$supabaseKey = Read-Host "Clave anónima (anon public key)"

if ([string]::IsNullOrWhiteSpace($supabaseKey)) {
    Write-Host "❌ No se ingresó la clave. Saliendo..." -ForegroundColor Red
    exit 1
}

# Verificar que la clave parece válida (empieza con eyJ)
if (-not $supabaseKey.StartsWith("eyJ")) {
    Write-Host "⚠️  Advertencia: La clave normalmente empieza con 'eyJ...'" -ForegroundColor Yellow
    $continuar = Read-Host "¿Continuar de todos modos? (S/N)"
    if ($continuar -ne "S" -and $continuar -ne "s") {
        exit 1
    }
}

# Crear el contenido del archivo
$envContent = @"
# Configuración de Supabase para JASICORPORATIONS GESTION DE PRESTAMOS
# Generado automáticamente

NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseKey
"@

# Escribir el archivo
$envPath = Join-Path $PSScriptRoot ".env.local"

try {
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    Write-Host ""
    Write-Host "✅ Archivo .env.local creado exitosamente!" -ForegroundColor Green
    Write-Host "📍 Ubicación: $envPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 Contenido del archivo:" -ForegroundColor Cyan
    Write-Host $envContent
    Write-Host ""
    Write-Host "🚀 Próximo paso: Reinicia el servidor con 'npm.cmd run dev'" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear el archivo: $_" -ForegroundColor Red
    exit 1
}



