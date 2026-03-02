# Script para actualizar la clave anónima en Vercel
# Ejecutar: .\actualizar-clave-vercel.ps1

Write-Host "🔑 Actualizar Clave Anónima en Vercel" -ForegroundColor Cyan
Write-Host ""

$nuevaClave = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbnJnYmRrenhrdHV5bXhkbXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTU0NTksImV4cCI6MjA4MjQzMTQ1OX0.hUMI0ta9h6nbNDvwfbZIRFhGN1Rdr3Uaw8BIORL0DGM"

Write-Host "📋 Instrucciones para actualizar la clave:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ve a: https://vercel.com/johns-projects-9d4c1d75/.cursor/settings/environment-variables" -ForegroundColor White
Write-Host ""
Write-Host "2. Busca la variable NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host ""
Write-Host "3. Haz clic en el icono de editar (lápiz)" -ForegroundColor White
Write-Host ""
Write-Host "4. Reemplaza el valor con esta clave:" -ForegroundColor White
Write-Host $nuevaClave -ForegroundColor Green
Write-Host ""
Write-Host "5. Asegúrate de que la URL sea: https://ganrgbdkzxktuymxdmzf.supabase.co" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. Guarda los cambios" -ForegroundColor White
Write-Host ""
Write-Host "7. Vuelve a desplegar el proyecto" -ForegroundColor White
Write-Host ""





