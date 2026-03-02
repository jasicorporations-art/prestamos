# 📋 Instrucciones para usar deploy.bat

El archivo `deploy.bat` ha sido actualizado para desplegar a un **nuevo proyecto** en Vercel.

## 🚀 Cómo usar

### Opción 1: Doble clic
1. Simplemente haz doble clic en `deploy.bat`
2. El script:
   - Limpiará la caché
   - Compilará el proyecto
   - Te guiará para desplegar a Vercel

### Opción 2: Desde la terminal
```bash
deploy.bat
```

## 📝 Qué hace el script

1. **Limpia la caché**: Elimina la carpeta `.next` si existe
2. **Verifica Vercel CLI**: Comprueba que tengas Vercel CLI instalado
3. **Compila el proyecto**: Ejecuta `npm run build`
4. **Despliega a Vercel**: Ejecuta `vercel` (sin `--prod` para permitir crear nuevo proyecto)

## ⚠️ Primera vez usando Vercel CLI

Si es la primera vez que usas Vercel CLI, el comando `vercel` te pedirá:

1. **Iniciar sesión**: Te pedirá que inicies sesión en tu cuenta de Vercel
2. **Crear proyecto**: Te preguntará si quieres crear un nuevo proyecto
   - Responde **"Y" (Yes)** para crear un nuevo proyecto
3. **Nombre del proyecto**: Te pedirá un nombre (puedes usar: `prestamos-jasicorporations`)
4. **Configuración**: Te preguntará sobre la configuración (presiona Enter para usar los valores por defecto)

## 🔄 Si ya tienes un proyecto vinculado

Si ya ejecutaste `vercel link` o tienes un proyecto vinculado:
- El script usará ese proyecto automáticamente
- No te preguntará sobre crear uno nuevo

## 🌐 Después del despliegue

1. **URL de producción**: Vercel te dará una URL como `https://tu-proyecto.vercel.app`
2. **Configurar dominio**: 
   - Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
   - Selecciona tu proyecto
   - Ve a **Settings** → **Domains**
   - Agrega tu dominio personalizado (ej: `prestamos.jasicorporations.com`)

## 🔧 Variables de entorno

**IMPORTANTE**: Después de crear el proyecto, debes configurar las variables de entorno en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Settings** → **Environment Variables**
3. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (Y cualquier otra que necesites)

## 🐛 Solución de problemas

### Error: "Vercel CLI no está instalado"
```bash
npm install -g vercel
```

### Error en la compilación
- Revisa los errores en la consola
- Verifica que todas las dependencias estén instaladas: `npm install`

### Quiero desplegar a producción directamente
Si ya tienes un proyecto y quieres desplegar a producción:
```bash
vercel --prod
```

## 📚 Más información

Para más detalles sobre el despliegue, consulta:
- `DESPLIEGUE_VERCEL_PROYECTO_NUEVO.md` - Guía completa paso a paso
