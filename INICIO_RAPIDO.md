# 🚀 Inicio Rápido - Inversiones Nazaret Reynoso

## Pasos para poner en marcha la aplicación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase

#### a. Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com)
2. Crear una cuenta (gratuita)
3. Crear un nuevo proyecto
4. Esperar a que se complete la configuración (2-3 minutos)

#### b. Ejecutar el esquema SQL
1. En Supabase, ir a **SQL Editor**
2. Abrir el archivo `supabase/schema.sql`
3. Copiar todo el contenido
4. Pegar en el SQL Editor de Supabase
5. Hacer clic en **Run** o presionar `Ctrl+Enter`

#### c. Obtener credenciales
1. En Supabase, ir a **Settings** > **API**
2. Copiar:
   - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
   - **anon public** key (clave larga que comienza con `eyJ...`)

### 3. Configurar variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

### 4. Crear iconos de la PWA (Opcional pero recomendado)

Ver instrucciones en `public/ICONOS_INSTRUCCIONES.md`

Necesitas crear:
- `public/icon-192x192.png`
- `public/icon-512x512.png`

### 5. Ejecutar la aplicación

```bash
npm run dev
```

Abrir en el navegador: [http://localhost:3000](http://localhost:3000)

## ✅ Verificación

Una vez que la aplicación esté corriendo:

1. ✅ Ver el Dashboard con las métricas
2. ✅ Crear un motor de prueba en **Motores**
3. ✅ Crear un cliente de prueba en **Clientes**
4. ✅ Crear una venta en **Ventas**
5. ✅ Registrar un pago en **Pagos**
6. ✅ Ver la factura desde la lista de ventas

## 📱 Instalar como PWA

### En móvil (Android/iPhone):
1. Abrir la aplicación en el navegador móvil
2. Buscar la opción "Agregar a pantalla de inicio" o "Instalar app"
3. La aplicación se instalará como una app nativa

### En escritorio (Chrome/Edge):
1. Abrir la aplicación en el navegador
2. Buscar el icono de instalación en la barra de direcciones
3. Hacer clic para instalar

## 🆘 Problemas Comunes

### Error: "Supabase credentials not found"
- Verificar que el archivo `.env.local` existe
- Verificar que las variables tienen el prefijo `NEXT_PUBLIC_`
- Reiniciar el servidor de desarrollo después de crear `.env.local`

### Error al crear tablas en Supabase
- Verificar que estás en el SQL Editor correcto
- Asegurarse de que el proyecto de Supabase está completamente configurado
- Verificar que no hay errores de sintaxis en el SQL

### La PWA no se instala
- Verificar que los iconos existen en `public/`
- Verificar que el manifest.json es accesible
- Probar en un navegador compatible (Chrome, Edge, Safari)

## 📚 Documentación Completa

Ver `README.md` para documentación detallada.

---

¡Listo para usar! 🎉




