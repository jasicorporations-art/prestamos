# 🔑 Cómo Configurar Variables de Entorno en Vercel

## 📍 Ubicación Exacta

### Opción 1: Enlace Directo (Más Rápido)

Abre este enlace en tu navegador:
```
https://vercel.com/johns-projects-9d4d1d75/.cursor/settings/environment-variables
```

### Opción 2: Navegación Manual

1. **Abre Vercel Dashboard:**
   - Ve a: https://vercel.com/dashboard
   - Inicia sesión si es necesario

2. **Encuentra tu Proyecto:**
   - Busca el proyecto llamado **".cursor"** o **"johns-projects-9d4d1d75"**
   - Haz clic en el nombre del proyecto

3. **Ve a Settings:**
   - En la parte superior de la página, verás varias pestañas:
     - **Overview** | **Deployments** | **Analytics** | **Settings**
   - Haz clic en **"Settings"**

4. **Abre Environment Variables:**
   - En el menú lateral izquierdo (dentro de Settings), verás:
     - General
     - **Environment Variables** ← Haz clic aquí
     - Git
     - Domains
     - etc.

## ➕ Cómo Agregar las Variables

Una vez que estés en la página de **Environment Variables**, verás:

### Paso 1: Agregar Primera Variable

1. **Haz clic en el botón "Add New"** o **"Add"** (arriba a la derecha)

2. **Completa el formulario:**

   **Key (Nombre de la variable):**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   ```

   **Value (Valor):**
   ```
   https://ganrgbdkzxktuymxdmzf.supabase.co
   ```

   **Environments (Entornos):**
   - ✅ Marca **Production**
   - ✅ Marca **Preview**
   - ✅ Marca **Development**

3. **Haz clic en "Save"**

### Paso 2: Agregar Segunda Variable

1. **Haz clic en "Add New"** nuevamente

2. **Completa el formulario:**

   **Key (Nombre de la variable):**
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

   **Value (Valor):**
   ```
   [PEGA AQUÍ TU CLAVE ANÓNIMA DE SUPABASE]
   ```
   
   ⚠️ **Importante:** 
   - Esta clave la obtienes desde: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf/settings/api
   - Busca la sección "API Keys"
   - Copia la clave **"anon public"** (NO uses "service_role")
   - Es una clave muy larga que empieza con `eyJ...`

   **Environments (Entornos):**
   - ✅ Marca **Production**
   - ✅ Marca **Preview**
   - ✅ Marca **Development**

3. **Haz clic en "Save"**

## ✅ Verificación

Después de agregar ambas variables, deberías ver una tabla con:

| Key | Value | Environments |
|-----|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ganrgbdkzxktuymxdmzf.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (tu clave) | Production, Preview, Development |

## 🚀 Después de Configurar

Una vez que hayas agregado las variables:

1. **Vuelve a desplegar el proyecto:**
   - Opción A: Desde el Dashboard, ve a "Deployments" y haz clic en "Redeploy" en el último deployment
   - Opción B: Desde la terminal:
     ```powershell
     $env:PATH += ";C:\Users\Owner\AppData\Roaming\npm"
     vercel --prod
     ```

2. **Espera a que termine el build** (2-5 minutos)

3. **Verifica que funciona:**
   - Abre la URL de producción que te da Vercel
   - Debería cargar sin errores

## 🆘 Si No Puedes Encontrar el Proyecto

1. Ve a: https://vercel.com/dashboard
2. Busca en la lista de proyectos
3. Si no lo ves, verifica que estés en la cuenta correcta
4. El proyecto debería llamarse **".cursor"** o tener el nombre que le diste

## 📸 Estructura Visual de la Página

```
┌─────────────────────────────────────────────────┐
│  Vercel Dashboard                                │
├─────────────────────────────────────────────────┤
│  [.cursor] ← Haz clic aquí                       │
├─────────────────────────────────────────────────┤
│  Overview | Deployments | Analytics | Settings  │
│                                    ↑             │
│                              Haz clic aquí       │
├─────────────────────────────────────────────────┤
│  Settings                                        │
│  ├─ General                                     │
│  ├─ Environment Variables ← Haz clic aquí      │
│  ├─ Git                                         │
│  └─ ...                                         │
└─────────────────────────────────────────────────┘
```

## 🔍 Obtener la Clave Anónima de Supabase

Si no tienes la clave `NEXT_PUBLIC_SUPABASE_ANON_KEY`:

1. Ve a: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf/settings/api
2. Busca la sección **"API Keys"**
3. Verás dos claves:
   - **anon public** ← Esta es la que necesitas
   - **service_role** ← NO uses esta
4. Haz clic en el icono de **copiar** al lado de "anon public"
5. Pega esa clave en Vercel como el valor de `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

**¿Necesitas más ayuda?** Si tienes problemas para encontrar alguna opción, avísame y te guío más específicamente.






