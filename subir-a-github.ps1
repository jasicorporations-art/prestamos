# Subir proyecto prestamos a un repo GitHub (prestamos vacio)
# Ejecuta en PowerShell desde esta carpeta.
# ANTES: Sustituye TU_USUARIO por tu usuario de GitHub y REPO por el nombre del repo (ej. prestamos)

$repoUrl = "https://github.com/TU_USUARIO/prestamos.git"
# Si tu repo se llama distinto, cambia: prestamos.git -> nombre-del-repo.git

Set-Location $PSScriptRoot

Write-Host "Conectando con GitHub y subiendo codigo..." -ForegroundColor Cyan
Write-Host ""

# Anadir remote (si ya lo añadiste antes, saldra error; puedes ignorarlo o ejecutar: git remote set-url origin $repoUrl)
git remote add origin $repoUrl 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote set-url origin $repoUrl
}

# Ver que hay para subir
git status
Write-Host ""

# Añadir todo (respeta .gitignore)
git add .
git status

# Primer commit si no hay
$commitCount = (git rev-list --count HEAD 2>$null)
if (-not $commitCount -or $commitCount -eq "0") {
    git commit -m "Initial commit: proyecto prestamos Next.js + Prisma + Supabase"
}

# Rama main
git branch -M main

# Subir
Write-Host ""
Write-Host "Subiendo a GitHub (origin main)..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Listo. Tu repo en GitHub ya tiene todo el proyecto." -ForegroundColor Green
    Write-Host "Abre: https://github.com/TU_USUARIO/prestamos" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Si pide usuario/contraseña: usa tu usuario de GitHub y un Personal Access Token (no la contrasena)." -ForegroundColor Yellow
    Write-Host "Crear token: GitHub -> Settings -> Developer settings -> Personal access tokens" -ForegroundColor Yellow
}
Write-Host ""
pause
