# 📊 Panel de Administración - Resumen

## ✅ Funcionalidades Implementadas

### 1. Tabla Profesional de Cuotas Pendientes

La tabla muestra todas las cuotas pendientes de todas las ventas con las siguientes columnas:

- **Cliente**: Nombre completo del cliente y número de cuota
- **Teléfono**: Teléfono del cliente (extraído de la dirección o cédula)
- **Motor (Modelo)**: Marca, matrícula y número de chasis
- **Cuota Base**: Monto de la cuota sin penalidades
- **Fecha Vencimiento**: Fecha en que vence la cuota
- **Penalidad**: Cargo adicional por retraso (5% por semana)
- **Total a Pagar**: Cuota base + penalidad
- **Acción**: Botón de WhatsApp para contactar al cliente

### 2. Lógica de Colores

#### 🔴 Fila Roja (Vencida)
- Se aplica cuando la fecha de vencimiento ya pasó y la cuota no está pagada
- Borde izquierdo rojo y fondo rojo claro
- Muestra los días de atraso

#### 🟡 Fila Amarilla (Por Vencer)
- Se aplica cuando faltan 3 días o menos para el vencimiento
- Borde izquierdo amarillo y fondo amarillo claro
- Alerta preventiva para contactar al cliente

#### ⚪ Fila Blanca (Vigente)
- Cuotas que aún no están próximas a vencer
- Fondo blanco normal

### 3. Cálculo de Penalidad

- **Porcentaje**: 5% por cada semana de retraso
- **Cálculo**: 
  - Semanas de atraso = Días de atraso ÷ 7 (redondeado hacia arriba)
  - Penalidad = Cuota Base × 5% × Semanas de atraso
- **Ejemplo**: 
  - Cuota de $1,000 con 15 días de atraso
  - Semanas: 15 ÷ 7 = 2.14 → 3 semanas
  - Penalidad: $1,000 × 5% × 3 = $150

### 4. Botón de WhatsApp

Cada fila tiene un botón de WhatsApp que:

- **Abre WhatsApp Web/App** con el número del cliente
- **Mensaje predefinido** incluye:
  - Nombre del cliente
  - Modelo del motor
  - Monto de la cuota
  - Fecha de vencimiento
  - Total a pagar (con penalidad si aplica)
  - Solicitud de confirmación de pago

**Ejemplo de mensaje:**
```
Hola Juan Pérez, te contactamos de Inversiones Nazaret Reynoso. 
Tu pago por el motor Yamaha ABC-123 de $2,000.00 venció el 15/01/2024. 
Con la penalidad, el total es $2,150.00. 
Por favor, confirma tu pago.
```

### 5. Diseño Responsivo

- **Desktop**: Tabla completa con todas las columnas visibles
- **Móvil**: Vista de tarjetas con toda la información organizada
- **Adaptable**: Se ajusta automáticamente al tamaño de la pantalla

### 6. Resumen de Métricas

En la parte superior se muestran tres tarjetas:

- **Cuotas Vencidas**: Cantidad de cuotas que ya vencieron
- **Por Vencer (3 días)**: Cuotas que vencen en los próximos 3 días
- **Total Pendiente**: Suma de todos los totales a pagar (incluyendo penalidades)

## 🔧 Cómo Funciona

### Cálculo de Cuotas Pendientes

1. **Obtiene todas las ventas** con saldo pendiente
2. **Para cada venta**, calcula:
   - Monto por cuota = Monto Total ÷ Cantidad de Cuotas
   - Fecha de vencimiento = Fecha de Venta + (Número de Cuota × 30 días)
3. **Verifica si la cuota está pagada**:
   - Si hay un pago con ese número de cuota, se omite
   - Si no hay pago, se agrega a la lista de pendientes
4. **Calcula penalidades** para cuotas vencidas
5. **Ordena** por fecha de vencimiento (las más vencidas primero)

### Fechas de Vencimiento

- Las cuotas se calculan mensualmente desde la fecha de venta
- Cuota 1 vence 1 mes después de la venta
- Cuota 2 vence 2 meses después de la venta
- Y así sucesivamente...

## 📱 Acceso al Panel

El panel está disponible en:
- **URL**: `/admin`
- **Navegación**: Menú "Panel Admin" en la barra superior
- **Icono**: Gráfico de barras (BarChart3)

## ⚠️ Nota sobre Teléfonos

Actualmente, el sistema intenta extraer el teléfono del cliente desde:
1. **Campo de dirección** (si contiene un número de teléfono)
2. **Cédula** (como fallback)

**Recomendación**: Agregar un campo `telefono` a la tabla `clientes` en Supabase para mejor precisión.

## 🎨 Características de Diseño

- ✅ Diseño limpio y profesional
- ✅ Colores intuitivos (rojo = vencida, amarillo = alerta)
- ✅ Iconos claros (WhatsApp, Alertas, Calendario)
- ✅ Responsive para móviles y tablets
- ✅ Tabla ordenable y fácil de leer
- ✅ Botones de acción claros y accesibles

## 📝 Archivos Creados

1. **`lib/services/cuotas.ts`**: Servicio para calcular cuotas pendientes
2. **`app/admin/page.tsx`**: Página del panel de administración
3. **`components/Navigation.tsx`**: Actualizado con enlace al panel

---

**El Panel de Administración está listo para usar. Accede desde el menú "Panel Admin" en la navegación.** ✅



