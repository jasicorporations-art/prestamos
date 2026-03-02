# 📱 Sistema de Recordatorios Automáticos de WhatsApp

## ✅ Funcionalidades Implementadas

### 1. Página de Recordatorios (`/recordatorios`)

Una página dedicada que muestra:
- **Cuotas que vencen en 2 días o menos**
- **Mensajes personalizados** para cada cliente
- **Botones para enviar WhatsApp** individual o en lote
- **Vista previa del mensaje** que se enviará
- **Estado de envío** (pendiente/enviado)

### 2. Mensajes de Recordatorio

Los mensajes se generan automáticamente con:
- **Saludo personalizado** con el nombre del cliente
- **Información del motor** (marca y matrícula)
- **Monto de la cuota** y fecha de vencimiento
- **Días restantes** (HOY, MAÑANA, o X días)
- **Total a pagar** (incluyendo penalidades si aplica)

### 3. Cálculo Automático

El sistema identifica automáticamente:
- Cuotas que vencen **HOY** (días restantes = 0)
- Cuotas que vencen **MAÑANA** (días restantes = 1)
- Cuotas que vencen en **2 días** (días restantes = 2)

### 4. Envío en Lote

- Botón **"Enviar Todos"** para enviar recordatorios a todos los clientes pendientes
- Se abren las ventanas de WhatsApp automáticamente
- Marca los recordatorios como enviados

## 🚀 Cómo Usar

### Opción 1: Envío Manual (Recomendado)

1. Ve a la página **"Recordatorios"** en el menú de navegación
2. Revisa la lista de recordatorios pendientes
3. Haz clic en **"Enviar"** para cada cliente individualmente
4. O haz clic en **"Enviar Todos"** para enviar a todos a la vez

### Opción 2: Automatización con Cron Job

Puedes configurar un servicio de cron job para que llame automáticamente al endpoint API:

1. **URL del Endpoint**: `https://tu-dominio.com/api/recordatorios`
2. **Frecuencia**: Diariamente (recomendado a las 9:00 AM)
3. **Servicios recomendados**:
   - [cron-job.org](https://cron-job.org) (gratis)
   - [EasyCron](https://www.easycron.com) (gratis)
   - [UptimeRobot](https://uptimerobot.com) (gratis)

**Nota**: El endpoint solo devuelve los datos. Para enviar automáticamente necesitarías:
- WhatsApp Business API
- Un servicio de terceros como Twilio
- O revisar manualmente la página de recordatorios

## 📋 Estructura de Mensajes

### Mensaje para Cuota que Vence HOY:
```
Hola Juan Pérez, te recordamos de Inversiones Nazaret Reynoso. 
Tu pago por el motor Yamaha ABC-123 de $2,000.00 vence HOY (15/01/2024). 
El total a pagar es $2,000.00. 
Por favor, confirma tu pago. Gracias.
```

### Mensaje para Cuota que Vence MAÑANA:
```
Hola Juan Pérez, te recordamos de Inversiones Nazaret Reynoso. 
Tu pago por el motor Yamaha ABC-123 de $2,000.00 vence MAÑANA (16/01/2024). 
El total a pagar es $2,000.00. 
Por favor, confirma tu pago. Gracias.
```

### Mensaje para Cuota que Vence en 2 Días:
```
Hola Juan Pérez, te recordamos de Inversiones Nazaret Reynoso. 
Tu pago por el motor Yamaha ABC-123 de $2,000.00 vence en 2 días (17/01/2024). 
El total a pagar es $2,000.00. 
Por favor, confirma tu pago. Gracias.
```

## 🎨 Características de la Interfaz

- ✅ **Resumen de métricas**: Pendientes, Vencen Hoy, Enviados
- ✅ **Códigos de color**: 
  - Rojo para cuotas que vencen HOY
  - Naranja para cuotas que vencen MAÑANA
  - Amarillo para cuotas que vencen en 2 días
- ✅ **Vista previa del mensaje**: Muestra exactamente qué se enviará
- ✅ **Estado de envío**: Marca visualmente los recordatorios enviados
- ✅ **Actualización automática**: Se recarga cada 5 minutos

## 📁 Archivos Creados

1. **`lib/services/recordatorios.ts`**: Lógica para identificar recordatorios pendientes
2. **`lib/services/whatsapp.ts`**: Funciones para generar mensajes y URLs de WhatsApp
3. **`app/recordatorios/page.tsx`**: Página de recordatorios
4. **`app/api/recordatorios/route.ts`**: Endpoint API para automatización
5. **`components/Navigation.tsx`**: Actualizado con enlace a Recordatorios

## 🔧 Configuración Avanzada

### Cambiar Días de Anticipación

Para cambiar de 2 días a otro número, edita `lib/services/recordatorios.ts`:

```typescript
// Cambiar esta línea:
if (diasRestantes >= 0 && diasRestantes <= 2) {
// Por ejemplo, para 3 días:
if (diasRestantes >= 0 && diasRestantes <= 3) {
```

### Personalizar Mensajes

Edita `lib/services/whatsapp.ts` para personalizar el formato de los mensajes.

## ⚠️ Notas Importantes

- **WhatsApp Web**: Necesitas tener WhatsApp Web abierto en tu navegador para enviar mensajes
- **Envío Manual**: Los mensajes se abren en nuevas ventanas, debes confirmar el envío manualmente
- **Automatización Completa**: Para envío completamente automático, necesitarías WhatsApp Business API (de pago)

## ✅ Resultado

Ahora tienes un sistema completo para:
- ✅ Identificar cuotas que necesitan recordatorios
- ✅ Generar mensajes personalizados
- ✅ Enviar recordatorios por WhatsApp
- ✅ Hacer seguimiento de los envíos
- ✅ Automatizar el proceso (con configuración adicional)

---

**Accede a la página "Recordatorios" en el menú de navegación para comenzar a usar el sistema.** ✅



