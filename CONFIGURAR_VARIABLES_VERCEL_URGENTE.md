# ⚠️ URGENTE: Configurar Variables de Entorno en Vercel

## 🔴 Problema Actual

La aplicación está intentando conectarse a `placeholder.supabase.co` porque las variables de entorno **NO están configuradas en Vercel**.

## ✅ Solución Inmediata

### Paso 1: Ir a Vercel Dashboard

1. Ve a: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto: **sisi**
3. Ve a: **Settings** → **Environment Variables**

### Paso 2: Agregar las Variables

Agrega estas **2 variables**:

#### Variable 1:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://kpqvzkgsbawfqdsxjdjc.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### Variable 2:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### Paso 3: Redeploy

Después de agregar las variables:

1. Ve a **Deployments**
2. Haz clic en el menú **⋯** (tres puntos) del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine el deployment

## ✅ Verificación

Después del redeploy, verifica:

1. Abre: `https://sisi-seven.vercel.app/register`
2. Abre la consola del navegador (F12)
3. **NO deberías ver** errores de `placeholder.supabase.co`
4. Deberías poder validar códigos de registro

## 📸 Capturas de Pantalla

### Cómo agregar variables en Vercel:

1. **Settings** → **Environment Variables**
2. Haz clic en **Add New**
3. Ingresa el **Name** y **Value**
4. Selecciona los **Environments** (Production, Preview, Development)
5. Haz clic en **Save**

## ⚠️ Importante

- Las variables **DEBEN** empezar con `NEXT_PUBLIC_` para que funcionen en el cliente
- Después de agregar las variables, **SIEMPRE** haz un redeploy
- Las variables se aplican solo a nuevos deployments

## 🔍 Verificar que Funcionó

Ejecuta este comando en la consola del navegador (F12 → Console):

```javascript
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
```

**NO debería mostrar** `placeholder.supabase.co`



