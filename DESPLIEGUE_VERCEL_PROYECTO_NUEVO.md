# 🚀 Desplegar en Vercel como Proyecto Nuevo

Esta guía te ayudará a desplegar el sistema de gestión de préstamos en Vercel como un proyecto completamente nuevo.

## 📋 Requisitos Previos

1. **Cuenta de Vercel**: Crea una cuenta en [vercel.com](https://vercel.com) si no tienes una
2. **Repositorio Git**: Tu código debe estar en GitHub, GitLab o Bitbucket
3. **Cuenta de Supabase**: Necesitas un proyecto de Supabase configurado

## 🔧 Paso 1: Preparar el Repositorio

1. **Inicializar Git** (si no lo has hecho):
```bash
git init
git add .
git commit -m "Sistema de gestión de préstamos - versión inicial"
```

2. **Subir a GitHub/GitLab/Bitbucket**:
   - Crea un nuevo repositorio en tu plataforma Git preferida
   - Conecta tu repositorio local y haz push:
```bash
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git branch -M main
git push -u origin main
```

## 🌐 Paso 2: Crear Proyecto en Vercel

1. **Ir a Vercel Dashboard**:
   - Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
   - Inicia sesión con tu cuenta

2. **Importar Proyecto**:
   - Haz clic en **"Add New..."** → **"Project"**
   - Selecciona tu repositorio de Git
   - Vercel detectará automáticamente que es un proyecto Next.js

3. **Configurar el Proyecto**:
   - **Framework Preset**: Next.js (debería detectarse automáticamente)
   - **Root Directory**: `./` (raíz del proyecto)
   - **Build Command**: `npm run build` (por defecto)
   - **Output Directory**: `.next` (por defecto)
   - **Install Command**: `npm install` (por defecto)

## 🔐 Paso 3: Configurar Variables de Entorno

En la página de configuración del proyecto en Vercel, ve a **"Environment Variables"** y agrega:

### Variables Requeridas:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### Variables Opcionales (si las usas):

```
STRIPE_SECRET_KEY=tu_clave_secreta_de_stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=tu_clave_publica_de_stripe
STRIPE_WEBHOOK_SECRET=tu_secreto_de_webhook_stripe
RESEND_API_KEY=tu_clave_de_resend
```

**Importante**: 
- Marca estas variables para **Production**, **Preview** y **Development**
- Haz clic en **"Save"** después de agregar cada variable

## 🚀 Paso 4: Desplegar

1. **Despliegue Automático**:
   - Después de configurar las variables, Vercel comenzará a desplegar automáticamente
   - Puedes ver el progreso en la pestaña **"Deployments"**

2. **Verificar el Despliegue**:
   - Una vez completado, verás una URL como: `https://tu-proyecto.vercel.app`
   - Haz clic en la URL para ver tu aplicación en vivo

## 🌍 Paso 5: Configurar Dominio Personalizado (Opcional)

Si quieres usar un dominio personalizado como `prestamos.jasicorporations.com`:

1. **En Vercel Dashboard**:
   - Ve a **Settings** → **Domains**
   - Haz clic en **"Add Domain"**
   - Ingresa tu dominio: `prestamos.jasicorporations.com`

2. **Configurar DNS**:
   - Vercel te dará instrucciones específicas
   - Generalmente necesitarás agregar un registro CNAME o A en tu proveedor de DNS
   - Ejemplo de registro CNAME:
     - **Nombre**: `prestamos`
     - **Valor**: `cname.vercel-dns.com` (o el que te indique Vercel)

3. **Esperar Verificación**:
   - La verificación puede tardar desde minutos hasta 24 horas
   - Vercel mostrará un ✓ verde cuando esté listo

## ✅ Paso 6: Verificar que Todo Funciona

1. **Probar la Aplicación**:
   - Visita tu URL de Vercel
   - Verifica que la landing page carga correctamente
   - Prueba el registro de usuarios
   - Verifica que puedes iniciar sesión

2. **Verificar Variables de Entorno**:
   - Si hay errores relacionados con Supabase, verifica que las variables estén correctamente configuradas
   - Revisa los logs en Vercel Dashboard → **Deployments** → **View Function Logs**

## 🔄 Actualizaciones Futuras

Cada vez que hagas `git push` a tu repositorio:
- Vercel detectará automáticamente los cambios
- Creará un nuevo deployment
- Te notificará cuando esté listo

## 🐛 Solución de Problemas

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Ejecuta `npm install` localmente para verificar

### Error: "Environment variable not found"
- Verifica que hayas agregado todas las variables en Vercel
- Asegúrate de que estén marcadas para el entorno correcto (Production/Preview/Development)

### Error de Build
- Revisa los logs de build en Vercel
- Verifica que `next.config.js` esté correctamente configurado
- Asegúrate de que no haya errores de TypeScript

## 📝 Notas Importantes

- **Base de Datos**: Asegúrate de que tu proyecto de Supabase tenga todas las tablas necesarias
- **RLS (Row Level Security)**: Verifica las políticas de seguridad en Supabase
- **Backups**: Vercel hace backups automáticos, pero también considera hacer backups de tu base de datos

## 🎉 ¡Listo!

Tu sistema de gestión de préstamos debería estar funcionando en Vercel. Si tienes problemas, revisa los logs en el dashboard de Vercel o contacta al soporte.
