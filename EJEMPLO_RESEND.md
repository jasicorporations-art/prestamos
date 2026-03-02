# 📧 Ejemplo de Uso de Resend

## 🔑 Tu API Key

Tu API key de Resend tiene el formato: `re_xxxxxxxxx`

**⚠️ IMPORTANTE**: Nunca compartas tu API key públicamente. Solo úsala en variables de entorno.

## ✅ Configuración Correcta

### En Vercel (Variables de Entorno):

1. Ve a **Settings** → **Environment Variables**
2. Agrega:

   **Name**: `RESEND_API_KEY`  
   **Value**: `re_xxxxxxxxx` (tu API key real)  
   **Environments**: ✅ Production, ✅ Preview, ✅ Development

   **Name**: `RESEND_FROM_EMAIL`  
   **Value**: `JASICORPORATIONS <onboarding@resend.dev>` (para pruebas)  
   O: `JASICORPORATIONS <noreply@tudominio.com>` (si tienes dominio verificado)  
   **Environments**: ✅ Production, ✅ Preview, ✅ Development

### En Local (.env.local):

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=JASICORPORATIONS <onboarding@resend.dev>
```

## 🧪 Probar el Envío

### Opción 1: Usar la API Route

```bash
# Enviar a todos los recordatorios pendientes
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'
```

### Opción 2: Probar Directamente con Resend

El código ya está configurado para usar tu API key desde las variables de entorno:

```typescript
// lib/resend.ts ya está configurado así:
const resendApiKey = process.env.RESEND_API_KEY
export const resend = resendApiKey ? new Resend(resendApiKey) : null
```

## 📝 Nota sobre el Email Remitente

- **Para pruebas**: Usa `onboarding@resend.dev` (limitado a 100 correos/día)
- **Para producción**: Verifica tu dominio y usa `noreply@tudominio.com`

## ✅ Verificación

Después de configurar las variables:

1. Haz un **redeploy** en Vercel
2. Prueba enviando un correo:
   ```bash
   curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
     -H "Content-Type: application/json" \
     -d '{"enviarTodos": true}'
   ```
3. Revisa los logs de Resend para ver el estado

## 🔒 Seguridad

- ✅ La API key está en variables de entorno (seguro)
- ✅ No está hardcodeada en el código
- ✅ Solo se usa en el servidor (no expuesta al cliente)



