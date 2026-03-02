# Script para agregar Git al PATH
# Ejecutar como Administrador

$gitPath = "C:\Program Files\Git\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$gitPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$gitPath", "Machine")
    Write-Host "✅ Git agregado al PATH correctamente" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANTE: Cierra y vuelve a abrir PowerShell para que los cambios tengan efecto" -ForegroundColor Yellow
} else {
    Write-Host "✅ Git ya está en el PATH" -ForegroundColor Green
}









