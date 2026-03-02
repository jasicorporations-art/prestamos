# ✅ Verificar Configuración de Resend

## 🔍 Pasos de Verificación

### 1. Verificar Variables en Vercel

Las variables deben estar configuradas:
- ✅ `RESEND_API_KEY` = `re_xxxxxxxxx`
- ✅ `RESEND_FROM_EMAIL` = `JASICORPORATIONS <onboarding@resend.dev>`

### 2. Verificar Campo Email en Clientes

Ejecuta en Supabase para verificar si el campo existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' AND column_name = 'email';
```

Si no existe, ejecuta:
```sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
```

### 3. Redeploy en Vercel

Después de configurar las variables, **SIEMPRE** haz un redeploy:

1. Ve a Vercel Dashboard → Deployments
2. Haz clic en **⋯** (tres puntos) del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine

### 4. Probar el Sistema

#### Opción A: Obtener Recordatorios (GET)

```bash
curl https://sisi-seven.vercel.app/api/enviar-recordatorio
```

Deberías ver una lista de recordatorios pendientes.

#### Opción B: Enviar Correos (POST)

```bash
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'
```

Deberías recibir una respuesta con:
- `success: true`
- `enviados: X` (número de correos enviados)
- `fallidos: Y` (número de correos que fallaron)

## 🐛 Solución de Problemas

### Error: "Resend no está configurado"
- **Causa**: La variable `RESEND_API_KEY` no está configurada o no se aplicó
- **Solución**: 
  1. Verifica que la variable esté en Vercel
  2. Haz un **redeploy** completo
  3. Espera 1-2 minutos después del redeploy

### Error: "Invalid API key"
- **Causa**: La API key es incorrecta o tiene espacios
- **Solución**: 
  1. Verifica que la key sea exactamente `re_xxxxxxxxx` (sin espacios)
  2. Copia y pega directamente desde Resend

### Error: "Domain not verified"
- **Causa**: El email remitente no está verificado
- **Solución**: 
  1. Usa `onboarding@resend.dev` para pruebas
  2. O verifica tu dominio en Resend

### No se envían correos
- **Causa 1**: Los clientes no tienen email
- **Solución**: Agrega emails a los clientes en la base de datos

- **Causa 2**: No hay recordatorios pendientes
- **Solución**: Verifica con GET primero para ver si hay recordatorios

## ✅ Checklist de Verificación

- [ ] Variables configuradas en Vercel (`RESEND_API_KEY` y `RESEND_FROM_EMAIL`)
- [ ] Redeploy realizado después de configurar variables
- [ ] Campo `email` agregado a tabla `clientes` en Supabase
- [ ] Al menos un cliente tiene email válido registrado
- [ ] Hay recordatorios pendientes (cuotas que vencen en 2 días)
- [ ] Prueba GET funciona y muestra recordatorios
- [ ] Prueba POST funciona y envía correos

## 🧪 Prueba Completa

Ejecuta estos comandos en orden:

```bash
# 1. Verificar que hay recordatorios
curl https://sisi-seven.vercel.app/api/enviar-recordatorio

# 2. Enviar correos de prueba
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'

# 3. Verificar en Resend Dashboard que los correos se enviaron
# Ve a: https://resend.com/emails
```

## 📧 Verificar en Resend

1. Ve a [https://resend.com/emails](https://resend.com/emails)
2. Deberías ver los correos enviados
3. Revisa el estado (delivered, bounced, etc.)



