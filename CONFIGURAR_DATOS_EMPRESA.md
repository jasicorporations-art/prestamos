# 🏢 Configurar Datos de la Empresa

## 📋 Datos Configurables

He creado un archivo de configuración donde puedes modificar los datos de la empresa que aparecen en los recibos.

## 🔧 Cómo Configurar

### Paso 1: Abrir el Archivo de Configuración

Abre el archivo: `lib/constants.ts`

### Paso 2: Modificar los Datos

Encontrarás esta estructura:

```typescript
export const EMPRESA = {
  nombre: 'JASICORPORATIONS GESTION DE PRESTAMOS',
  telefono: '(809) 555-1234', // Cambia este número
  direccion: 'Calle Principal #123, Santo Domingo, República Dominicana', // Cambia esta dirección
  email: 'contacto@jasicorporations.com', // Opcional
  rnc: '123-45678-9', // Opcional - Registro Nacional de Contribuyente
}
```

### Paso 3: Actualizar los Valores

Modifica los valores según tu empresa:

- **nombre:** Nombre completo de la empresa
- **telefono:** Número de teléfono (formato libre)
- **direccion:** Dirección completa
- **email:** Email de contacto (opcional, puedes eliminarlo si no lo usas)
- **rnc:** RNC o número de identificación fiscal (opcional)

### Paso 4: Guardar y Reiniciar

1. **Guarda** el archivo
2. **Reinicia el servidor** si está corriendo
3. Los cambios se aplicarán automáticamente

## 📄 Dónde Aparecen Estos Datos

Los datos de la empresa aparecen en:

- ✅ **Recibos de pago** - Encabezado completo
- ✅ **Facturas de venta** - (Puedes agregarlo también si quieres)

## 🎯 Ejemplo

```typescript
export const EMPRESA = {
  nombre: 'JASICORPORATIONS GESTION DE PRESTAMOS',
  telefono: '(809) 555-1234',
  direccion: 'Av. Winston Churchill #123, Santo Domingo Este, R.D.',
  email: 'ventas@jasicorporations.com',
  rnc: '131-123456-7',
}
```

---

**Modifica `lib/constants.ts` con los datos reales de tu empresa.** 🏢



