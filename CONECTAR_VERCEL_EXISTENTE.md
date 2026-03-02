# 🔗 Conectar Proyecto con Vercel Existente

## 📋 Información del Proyecto Vercel

- **Deployment**: `nextjs-boilerplate-niyfuhxp3-johns-projects-9d4c1d75.vercel.app`
- **Domain**: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`

## 🚀 Pasos para Conectar

### Opción 1: Conectar Repositorio Git (Recomendado)

1. **Subir el código a Git** (si aún no lo has hecho):
   ```bash
   git init
   git add .
   git commit -m "JASICORPORATIONS GESTION DE PRESTAMOS - Proyecto completo"
   ```

2. **Crear repositorio en GitHub**:
   - Ve a [github.com](https://github.com)
   - Crea un nuevo repositorio (público o privado)
   - Sigue las instrucciones para conectar

3. **Subir el código**:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```

4. **En Vercel Dashboard**:
   - Ve a tu proyecto: `nextjs-boilerplate-niyfuhxp3-johns-projects-9d4c1d75.vercel.app`
   - Ve a **Settings** → **Git**
   - Haz clic en **"Connect Git Repository"**
   - Selecciona tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Next.js

### Opción 2: Desplegar desde CLI (Rápido)

1. **Instalar Vercel CLI** (si no lo tienes):
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión en Vercel**:
   ```bash
   vercel login
   ```

3. **Conectar con el proyecto existente**:
   ```bash
   vercel link
   ```
   
   - Te pedirá el nombre del proyecto
   - Ingresa: `nextjs-boilerplate` (o el nombre que uses en Vercel)
   - O selecciona el proyecto de la lista

4. **Configurar variables de entorno**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   
   Cuando te pida los valores:
   - `NEXT_PUBLIC_SUPABASE_URL`: Tu URL de Supabase (ej: `https://xxxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Tu clave anónima de Supabase

5. **Desplegar a producción**:
   ```bash
   vercel --prod
   ```

### Opción 3: Desde el Dashboard de Vercel

1. **Ir a tu proyecto en Vercel**:
   - Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
   - Busca tu proyecto `nextjs-boilerplate`

2. **Subir código manualmente** (si no usas Git):
   - Ve a **Settings** → **General**
   - Busca la opción para subir código
   - O mejor: usa la Opción 1 o 2

3. **Configurar variables de entorno**:
   - Ve a **Settings** → **Environment Variables**
   - Agrega:
     - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
     - **Value**: Tu URL de Supabase
     - **Environments**: Production, Preview, Development
     - Haz clic en **Save**
   
   - Repite para:
     - **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **Value**: Tu clave anónima de Supabase
     - **Environments**: Production, Preview, Development
     - Haz clic en **Save**

4. **Desplegar**:
   - Ve a **Deployments**
   - Haz clic en **"Redeploy"** o espera a que se despliegue automáticamente si tienes Git conectado

## 🔐 Configurar Variables de Entorno (OBLIGATORIO)

**IMPORTANTE**: Sin estas variables, la aplicación NO funcionará.

### Desde el Dashboard de Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega estas dos variables:

#### Variable 1:
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://tu-proyecto.supabase.co` (reemplaza con tu URL real)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Save**

#### Variable 2:
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `tu_clave_anonima_aqui` (reemplaza con tu clave real)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Save**

### Obtener los valores de Supabase:

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. **Settings** → **API**
3. Copia:
   - **Project URL** → Usa para `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Usa para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## ✅ Verificar el Despliegue

1. **Esperar a que termine el build**:
   - Ve a **Deployments** en Vercel
   - Espera a que el estado cambie a "Ready" (verde)

2. **Probar la aplicación**:
   - Haz clic en el dominio: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`
   - Deberías ver la página de login

3. **Probar inicio de sesión**:
   - Intenta iniciar sesión con un usuario existente
   - Si no tienes usuarios, primero crea uno desde `/register`

## 🐛 Solución de Problemas

### Error: "Cannot connect to Supabase"

**Causa**: Variables de entorno no configuradas o incorrectas

**Solución**:
1. Verifica que las variables estén en **Settings** → **Environment Variables**
2. Verifica que los valores sean correctos (sin espacios, sin comillas)
3. Haz un **Redeploy** después de agregar las variables

### Error: "Build Failed"

**Causa**: Error en el código o dependencias faltantes

**Solución**:
1. Revisa los logs de build en Vercel
2. Prueba localmente: `npm run build`
3. Si funciona localmente, verifica que todas las dependencias estén en `package.json`

### La aplicación carga pero muestra errores

**Causa**: Variables de entorno incorrectas o base de datos no configurada

**Solución**:
1. Verifica las variables de entorno en Vercel
2. Verifica que la base de datos de Supabase esté configurada:
   - Ejecuta `supabase/schema.sql` en Supabase SQL Editor
   - Ejecuta otros scripts SQL necesarios (ver `QUE_SCRIPTS_SQL_EJECUTAR.md`)

## 📝 Checklist Final

Antes de considerar el despliegue completo:

- [ ] Código subido a Git o desplegado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos de Supabase configurada (schema.sql ejecutado)
- [ ] Build exitoso en Vercel
- [ ] Aplicación accesible en el dominio
- [ ] Login funciona correctamente
- [ ] Puedes crear usuarios nuevos (si es necesario)

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación estará funcionando en:
- **Deployment**: `nextjs-boilerplate-niyfuhxp3-johns-projects-9d4c1d75.vercel.app`
- **Domain**: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`

## 📞 Próximos Pasos

1. **Configurar dominio personalizado** (opcional):
   - Ve a **Settings** → **Domains**
   - Agrega tu dominio personalizado

2. **Configurar base de datos**:
   - Asegúrate de ejecutar todos los scripts SQL necesarios en Supabase
   - Ver: `QUE_SCRIPTS_SQL_EJECUTAR.md`

3. **Crear usuarios de prueba**:
   - Accede a `/register` para crear el primer usuario
   - O usa códigos de registro si los configuraste



