# 📧 Uso de la API de Envío de Recordatorios

## 🎯 Endpoint

**URL**: `/api/enviar-recordatorio`  
**Métodos**: `GET`, `POST`

## 📋 Métodos Disponibles

### GET - Obtener Recordatorios Pendientes

Obtiene la lista de recordatorios pendientes sin enviar correos.

**Ejemplo**:
```bash
curl https://sisi-seven.vercel.app/api/enviar-recordatorio
```

**Respuesta**:
```json
{
  "success": true,
  "count": 5,
  "recordatorios": [
    {
      "cuotaId": "venta-123-1",
      "cliente": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "telefono": "8091234567",
      "numeroPrestamo": "PREST-001",
      "montoAPagar": 5000.00,
      "diasRestantes": 2
    }
  ]
}
```

### POST - Enviar Recordatorios

Envía correos de recordatorio de pago.

#### Opción 1: Enviar a Todos

Envía correos a todos los clientes con cuotas que vencen en 2 días.

**Request**:
```json
{
  "enviarTodos": true
}
```

**Ejemplo**:
```bash
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Se procesaron 5 recordatorios",
  "enviados": 4,
  "fallidos": 1,
  "resultados": [
    {
      "cliente": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "success": true,
      "emailId": "abc123"
    },
    {
      "cliente": "María García",
      "email": "maria@ejemplo.com",
      "success": false,
      "error": "Cliente no tiene email válido"
    }
  ]
}
```

#### Opción 2: Enviar a Email Específico

Envía correo a un cliente específico por su email.

**Request**:
```json
{
  "email": "cliente@ejemplo.com"
}
```

**Ejemplo**:
```bash
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"email": "cliente@ejemplo.com"}'
```

#### Opción 3: Enviar por ID de Cuota

Envía correo para una cuota específica.

**Request**:
```json
{
  "cuotaId": "venta-123-1"
}
```

**Ejemplo**:
```bash
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"cuotaId": "venta-123-1"}'
```

## 📧 Contenido del Correo

El correo incluye:

✅ **Logo de JasiCorporations**  
✅ **Título**: "Recordatorio de Pago: Tu cuota vence en X días"  
✅ **Tabla con**:
- Número de préstamo
- Nombre
- Apellido
- Teléfono
- Monto a pagar (destacado)

## 🔄 Automatización

### Usando Cron Jobs

#### Opción 1: cron-job.org

1. Ve a [https://cron-job.org](https://cron-job.org)
2. Crea una cuenta
3. Crea un nuevo cron job:
   - **URL**: `https://sisi-seven.vercel.app/api/enviar-recordatorio`
   - **Método**: POST
   - **Body**: `{"enviarTodos": true}`
   - **Headers**: `Content-Type: application/json`
   - **Frecuencia**: Diario a las 9:00 AM

#### Opción 2: Vercel Cron

Agrega a `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/enviar-recordatorio",
    "schedule": "0 9 * * *"
  }]
}
```

## ⚙️ Configuración Requerida

Antes de usar, asegúrate de:

1. ✅ Configurar `RESEND_API_KEY` en Vercel
2. ✅ Configurar `RESEND_FROM_EMAIL` en Vercel
3. ✅ Agregar columna `email` a la tabla `clientes` (ver `supabase/agregar-email-clientes.sql`)
4. ✅ Los clientes deben tener email válido registrado

## 🧪 Pruebas

### Probar Localmente

```bash
# Obtener recordatorios
curl http://localhost:3000/api/enviar-recordatorio

# Enviar a todos
curl -X POST http://localhost:3000/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'
```

### Probar en Producción

```bash
# Obtener recordatorios
curl https://sisi-seven.vercel.app/api/enviar-recordatorio

# Enviar a todos
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'
```

## 📝 Notas

- Solo se envían correos a clientes con email válido
- Los clientes sin email se omiten automáticamente
- El sistema filtra cuotas que vencen en 2 días o menos
- Resend tiene límite de 100 correos/día en plan gratuito



