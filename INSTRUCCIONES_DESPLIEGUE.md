# Instrucciones de Despliegue a Vercel

## Cambios Realizados

1. ✅ **Corregido `lib/contexts/CompaniaContext.tsx`**: Agregadas verificaciones de `typeof window !== 'undefined'` para evitar errores durante la compilación del servidor.

2. ✅ **Actualizado `vercel.json`**: Agregados headers para `manifest.json` e iconos.

3. ✅ **Creados scripts de despliegue**: `deploy.bat` y `desplegar-vercel.ps1`

## Desplegar a Vercel

### Opción 1: Usar el script batch (Recomendado)
```batch
deploy.bat
```

### Opción 2: Comando manual
```powershell
# Agregar npm al PATH
$env:PATH += ";C:\Users\Owner\AppData\Roaming\npm"

# Desplegar
vercel --prod
```

### Opción 3: Desde Vercel Dashboard
1. Ve a https://vercel.com/dashboard
2. Selecciona el proyecto `cursor-nu-black`
3. Haz clic en "Deploy" o espera a que se despliegue automáticamente desde Git

## Configuración del Dominio

El dominio `dealers.jasicorporations.com` debe estar configurado en:
1. Vercel Dashboard → Proyecto → Settings → Domains
2. Agregar el dominio personalizado

## Variables de Entorno en Vercel

Asegúrate de que estas variables estén configuradas en Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Notas

- Vercel compilará el proyecto automáticamente
- Si hay errores, aparecerán en el log de Vercel
- El despliegue puede tardar 2-5 minutos



