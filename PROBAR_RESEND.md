# 🧪 Probar Sistema de Correos Resend

## ✅ Resultado del GET

El endpoint GET funciona correctamente:

```json
{
  "success": true,
  "count": 0,
  "recordatorios": []
}
```

**Interpretación**: 
- ✅ El API está funcionando
- ℹ️ No hay recordatorios pendientes actualmente (cuotas que vencen en 2 días)

## 📋 Para que Haya Recordatorios

Para que aparezcan recordatorios, necesitas:

1. **Ventas con cuotas pendientes** en la base de datos
2. **Cuotas que vencen en 2 días o menos** (no vencidas aún)
3. **Clientes con email válido** registrado

## 🧪 Probar con Datos de Prueba

### Opción 1: Crear Datos de Prueba

1. Crea una venta con cuotas
2. Asegúrate de que la fecha de vencimiento sea en 2 días
3. Agrega un email al cliente

### Opción 2: Probar con Email Específico

Si tienes un cliente con email, puedes probar directamente:

```bash
# En PowerShell
Invoke-WebRequest -Uri "https://sisi-seven.vercel.app/api/enviar-recordatorio" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email": "cliente@ejemplo.com"}' | Select-Object -ExpandProperty Content
```

## 🔍 Verificar Estado

### 1. Verificar Variables de Entorno

Las variables deben estar en Vercel:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### 2. Verificar Campo Email

Ejecuta en Supabase:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'clientes' AND column_name = 'email';
```

Si no existe, ejecuta:
```sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
```

### 3. Verificar Clientes con Email

```sql
SELECT nombre_completo, email 
FROM clientes 
WHERE email IS NOT NULL AND email != '';
```

### 4. Verificar Recordatorios

El endpoint GET muestra cuántos recordatorios hay. Si es 0:
- No hay cuotas que vencen en 2 días
- O todas las cuotas ya están vencidas
- O no hay ventas con cuotas pendientes

## 📧 Verificar en Resend Dashboard

1. Ve a [https://resend.com/emails](https://resend.com/emails)
2. Deberías ver los correos enviados (si se enviaron)
3. Revisa el estado de cada correo

## ✅ Estado Actual

- ✅ API funcionando correctamente
- ✅ Endpoint GET responde
- ℹ️ No hay recordatorios pendientes (esto es normal si no hay cuotas que vencen en 2 días)

## 🎯 Próximos Pasos

1. **Agregar emails a clientes** (si aún no lo has hecho)
2. **Crear ventas con cuotas** que vencen en 2 días
3. **Probar el envío** cuando haya recordatorios

El sistema está listo y funcionando. Solo necesita datos para enviar correos.



