# ⚡ Inicio Rápido - Nuevo Proyecto Supabase

## 🚀 Configuración Rápida (10 minutos)

### 1️⃣ Crear Proyecto en Supabase
- Ve a https://supabase.com
- Clic en **"New Project"**
- Nombre: `JASICORPORATIONS GESTION DE PRESTAMOS`
- Espera 2-3 minutos

### 2️⃣ Ejecutar SQL
- En Supabase: **SQL Editor**
- Copia TODO el contenido de `supabase/schema.sql`
- Pega y ejecuta (Run)
- ✅ Deberías ver "Success"

### 3️⃣ Obtener Credenciales
- En Supabase: **Settings** > **API**
- Copia:
  - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
  - **anon public** key (clave larga que empieza con `eyJ...`)

### 4️⃣ Configurar .env.local

**Opción A: Script automático (Recomendado)**
```powershell
.\crear-env-local.ps1
```
Sigue las instrucciones y pega tu URL y clave.

**Opción B: Manual**
Crea archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

### 5️⃣ Crear Usuario
- En Supabase: **Authentication** > **Users**
- **Add user**
- Email: `admin@jasicorporations.com`
- Password: (la que quieras)
- ✅ Marca **"Auto Confirm User"**
- **Create user**

### 6️⃣ Reiniciar Servidor
```powershell
# Detener (Ctrl + C si está corriendo)
npm.cmd run dev
```

### 7️⃣ ¡Listo! 🎉
- Abre: http://localhost:3000
- Inicia sesión con el usuario que creaste
- ¡Empieza a usar la aplicación!

---

📖 **Guía completa:** Ver `CONFIGURAR_NUEVO_SUPABASE.md` para más detalles



