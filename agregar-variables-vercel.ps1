# Script para agregar variables de entorno a Vercel

Write-Host "🔐 Agregando variables de entorno a Vercel..." -ForegroundColor Green

# Variable 1: NEXT_PUBLIC_SUPABASE_URL
Write-Host "`nAgregando NEXT_PUBLIC_SUPABASE_URL..." -ForegroundColor Yellow
Write-Host "Valor: https://kpqvzkgsbawfqdsxjdjc.supabase.co" -ForegroundColor Cyan
Write-Host "Presiona Enter después de cada prompt para agregar a todos los entornos" -ForegroundColor Gray

# Agregar para Production
"https://kpqvzkgsbawfqdsxjdjc.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Agregar para Preview  
"https://kpqvzkgsbawfqdsxjdjc.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview

# Agregar para Development
"https://kpqvzkgsbawfqdsxjdjc.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL development

# Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
Write-Host "`nAgregando NEXT_PUBLIC_SUPABASE_ANON_KEY..." -ForegroundColor Yellow
Write-Host "Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -ForegroundColor Cyan

$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng"

# Agregar para Production
$anonKey | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Agregar para Preview
$anonKey | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview

# Agregar para Development
$anonKey | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

Write-Host "`n✅ Variables agregadas!" -ForegroundColor Green
Write-Host "`n🔄 Ahora necesitas hacer un Redeploy:" -ForegroundColor Yellow
Write-Host "   1. Ve a: https://vercel.com/johns-projects-9d4c1d75/tienda-electrodomesticos-muebles" -ForegroundColor Cyan
Write-Host "   2. Ve a la pestaña 'Deployments'" -ForegroundColor Cyan
Write-Host "   3. Haz clic en los tres puntos (⋯) del último deployment" -ForegroundColor Cyan
Write-Host "   4. Selecciona 'Redeploy'" -ForegroundColor Cyan
Write-Host "`nO ejecuta: vercel --prod" -ForegroundColor Cyan

