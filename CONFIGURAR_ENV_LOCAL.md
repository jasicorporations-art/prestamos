# 🔑 Configurar .env.local con tus Credenciales

## ✅ Ya Tienes la URL de Supabase

Tu URL es: `https://ganrgbdkzxktuymxdmzf.supabase.co`

## 📋 Pasos para Configurar

### Paso 1: Obtener la Clave Anónima (anon key)

1. Ve a tu proyecto en Supabase: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf
2. Ve a **Settings** > **API**
3. Busca la sección **"API Keys"**
4. Copia la clave **"anon public"** (NO uses la "service_role")
   - Es una clave larga que comienza con `eyJ...`
   - Se ve algo así: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Paso 2: Crear el Archivo .env.local

1. En la raíz de tu proyecto (donde está `package.json`), crea un archivo llamado `.env.local`
   - ⚠️ **Importante:** Debe empezar con punto: `.env.local`
   - No debe tener extensión adicional

2. Abre el archivo y pega esto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ganrgbdkzxktuymxdmzf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui

# WhatsApp - Número de soporte al cliente (formato E.164: +15558584209)
WHATSAPP_NUMBER=+15558584209
NEXT_PUBLIC_WHATSAPP_NUMBER=+15558584209
```

3. Reemplaza `tu_clave_anonima_aqui` con la clave "anon public" que copiaste

4. **Ejemplo final:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://ganrgbdkzxktuymxdmzf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbnJnYmRrenhrdHV5bXhkbXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.ejemplo
```

### Paso 3: Verificar el Archivo

El archivo `.env.local` debe estar en:
```
C:\Users\Owner\.cursor\.env.local
```

Y debe contener exactamente:
- `NEXT_PUBLIC_SUPABASE_URL=...` (con el prefijo NEXT_PUBLIC_)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` (con el prefijo NEXT_PUBLIC_)

## ⚠️ Importante: Diferencia con el Ejemplo de Supabase

El ejemplo que te dio Supabase usa:
```javascript
const supabaseKey = process.env.SUPABASE_KEY
```

Pero en **Next.js necesitamos usar `NEXT_PUBLIC_`** porque:
- Las variables sin `NEXT_PUBLIC_` solo funcionan en el servidor
- Supabase se usa en el cliente (navegador)
- Por eso usamos `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## ✅ Después de Configurar

1. **Guarda el archivo** `.env.local`
2. **Reinicia el servidor:**
   ```powershell
   # Detener el servidor (Ctrl + C si está corriendo)
   # Luego:
   $env:PATH += ";C:\Program Files\nodejs"
   npm.cmd run dev
   ```
3. **Abre** `http://localhost:3000`
4. **Prueba** crear un motor o cliente

## 🆘 Verificación

Si todo está bien:
- ✅ No verás el warning "Supabase credentials not found"
- ✅ Podrás crear, editar y eliminar datos
- ✅ Los datos se guardarán en Supabase

Si hay problemas:
- Verifica que el archivo se llama `.env.local` (con punto)
- Verifica que las variables tienen el prefijo `NEXT_PUBLIC_`
- Reinicia el servidor después de crear/modificar `.env.local`

---

**¿Ya tienes la clave "anon public"? Si la tienes, crea el archivo `.env.local` con tus credenciales.** 🔑



