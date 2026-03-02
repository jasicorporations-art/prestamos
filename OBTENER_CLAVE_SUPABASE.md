# 🔑 Cómo Obtener tu Clave Anónima de Supabase

## 📍 Lo que Ya Tienes

✅ **URL de Supabase:** `https://ganrgbdkzxktuymxdmzf.supabase.co`

## 🔍 Lo que Necesitas Obtener

Necesitas la **clave "anon public"** (el valor real, no el código).

## 📋 Pasos para Obtener la Clave

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. **Abre tu proyecto en Supabase:**
   - Ve a: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf
   - O inicia sesión en supabase.com y selecciona tu proyecto

2. **Ve a Settings:**
   - En el menú lateral izquierdo, haz clic en el icono de **⚙️ Settings** (Configuración)
   - O ve directamente a: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf/settings/api

3. **Busca "API Keys":**
   - En la página de Settings > API
   - Verás una sección llamada **"API Keys"** o **"Claves API"**

4. **Copia la clave "anon public":**
   - Verás dos claves:
     - **anon public** ← Esta es la que necesitas
     - **service_role** ← NO uses esta (es privada)
   - Haz clic en el icono de **copiar** (📋) al lado de "anon public"
   - O selecciona y copia toda la clave
   - Es una clave muy larga que comienza con `eyJ...`

### Opción 2: Desde el Código de Ejemplo

Si Supabase te mostró un código de ejemplo, la clave puede estar ahí, pero normalmente solo muestran el código, no el valor real.

## 📝 Ejemplo de cómo se ve la clave

La clave "anon public" se ve así (es MUY larga):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbnJnYmRrenhrdHV5bXhkbXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.abcdefghijklmnopqrstuvwxyz1234567890
```

## ✅ Después de Obtener la Clave

Una vez que tengas la clave "anon public", crea el archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ganrgbdkzxktuymxdmzf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=pega_aqui_la_clave_que_copiaste
```

## 🆘 Si No Puedes Encontrarla

1. **Verifica que estás en el proyecto correcto:**
   - El nombre del proyecto debe aparecer en la parte superior
   - La URL debe tener: `ganrgbdkzxktuymxdmzf`

2. **Busca en diferentes lugares:**
   - Settings > API
   - Project Settings > API
   - Dashboard > Settings

3. **Si no la encuentras:**
   - Puede que necesites crear un nuevo proyecto
   - O contactar con el soporte de Supabase

---

**¿Puedes acceder a Settings > API en tu proyecto de Supabase?** 

Si sí, busca la sección "API Keys" y copia la clave "anon public". Luego crea el archivo `.env.local` con esa clave.



