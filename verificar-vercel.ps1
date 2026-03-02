# Script para verificar que el proyecto está listo para Vercel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificación para Despliegue en Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe package.json
Write-Host "1. Verificando package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✓ package.json existe" -ForegroundColor Green
} else {
    Write-Host "   ✗ package.json NO existe" -ForegroundColor Red
    exit 1
}

# Verificar que existe next.config.js
Write-Host "2. Verificando next.config.js..." -ForegroundColor Yellow
if (Test-Path "next.config.js") {
    Write-Host "   ✓ next.config.js existe" -ForegroundColor Green
} else {
    Write-Host "   ✗ next.config.js NO existe" -ForegroundColor Red
}

# Verificar que existe vercel.json
Write-Host "3. Verificando vercel.json..." -ForegroundColor Yellow
if (Test-Path "vercel.json") {
    Write-Host "   ✓ vercel.json existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠ vercel.json NO existe (opcional)" -ForegroundColor Yellow
}

# Verificar que existe .env.local (para referencia)
Write-Host "4. Verificando variables de entorno..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✓ .env.local existe (local)" -ForegroundColor Green
    Write-Host "   ⚠ Recuerda configurar las variables en Vercel también" -ForegroundColor Yellow
} else {
    Write-Host "   ⚠ .env.local NO existe" -ForegroundColor Yellow
    Write-Host "   ⚠ Asegúrate de configurar las variables en Vercel" -ForegroundColor Yellow
}

# Verificar que node_modules existe
Write-Host "5. Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠ node_modules NO existe" -ForegroundColor Yellow
    Write-Host "   Ejecuta: npm install" -ForegroundColor Yellow
}

# Verificar build
Write-Host "6. Verificando que el proyecto compila..." -ForegroundColor Yellow
Write-Host "   Ejecutando: npm run build" -ForegroundColor Cyan
Write-Host ""

$buildResult = & npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "   ✓ Build exitoso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "   ✗ Build falló" -ForegroundColor Red
    Write-Host "   Revisa los errores arriba" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resumen" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Instalar Vercel CLI: npm install -g vercel" -ForegroundColor White
Write-Host "2. Iniciar sesión: vercel login" -ForegroundColor White
Write-Host "3. Conectar proyecto: vercel link" -ForegroundColor White
Write-Host "4. Configurar variables de entorno:" -ForegroundColor White
Write-Host "   - vercel env add NEXT_PUBLIC_SUPABASE_URL production" -ForegroundColor Gray
Write-Host "   - vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production" -ForegroundColor Gray
Write-Host "5. Desplegar: vercel --prod" -ForegroundColor White
Write-Host ""
Write-Host "O sigue la guía en: DESPLEGAR_A_VERCEL_EXISTENTE.md" -ForegroundColor Cyan
Write-Host ""

