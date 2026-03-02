# JASICORPORATIONS GESTION DE PRESTAMOS - PWA

Sistema de gestión de préstamos desarrollado como Progressive Web App (PWA) con Next.js.

## 🚀 Características

- ✅ Gestión completa de préstamos
- ✅ Gestión de clientes con información de garantes
- ✅ Sistema de préstamos con financiamiento por cuotas
- ✅ Registro de pagos con deducción automática de saldo
- ✅ Generación de contratos y recibos optimizados para impresión
- ✅ Dashboard con métricas en tiempo real
- ✅ Gestión de mora y cargos automáticos
- ✅ Progressive Web App (PWA) instalable en móviles
- ✅ Interfaz responsive y moderna con Tailwind CSS

## 📋 Requisitos Previos

- Node.js 18+ y npm/yarn
- Cuenta de Supabase (gratuita)

## 🚀 Despliegue Rápido en Vercel

**¿Quieres desplegar tu aplicación en producción?** Sigue la guía completa en: **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)**

### Resumen rápido:
1. Sube tu código a GitHub/GitLab/Bitbucket
2. Conecta tu repositorio con Vercel
3. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. ¡Despliega! Vercel lo hará automáticamente

## 🛠️ Instalación Local

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar Supabase:**

   **Opción A: Crear un nuevo proyecto independiente (Recomendado)**
   - Sigue la guía completa en: `CONFIGURAR_NUEVO_SUPABASE.md`
   - O ejecuta el script: `.\crear-env-local.ps1` (te pedirá la URL y clave)

   **Opción B: Usar proyecto existente**
   - Crear un proyecto en [Supabase](https://supabase.com) si no tienes uno
   - Ejecutar el script SQL en el SQL Editor de Supabase:
     - Abrir `supabase/schema.sql`
     - Copiar y pegar el contenido en el SQL Editor de Supabase
     - Ejecutar el script
   - Obtener las credenciales de Supabase:
     - Ir a Settings > API
     - Copiar la URL del proyecto y la clave anónima (anon key)

4. **Configurar variables de entorno:**

   Crear un archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

5. **Ejecutar el proyecto en desarrollo:**
```bash
npm run dev
```

6. **Abrir en el navegador:**
   - Navegar a `http://localhost:3000`

## 📱 Configuración PWA

La aplicación está configurada como PWA. Para que funcione completamente:

1. **Iconos:**
   - Crear iconos de 192x192 y 512x512 píxeles
   - Guardarlos como `public/icon-192x192.png` y `public/icon-512x512.png`
   - Puedes usar herramientas como [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)

2. **Instalación en móvil:**
   - Abrir la aplicación en el navegador móvil
   - El navegador mostrará una opción para "Agregar a pantalla de inicio"
   - La aplicación funcionará como una app nativa

## 🗄️ Estructura de la Base de Datos

### Tablas:

- **clientes**: Almacena información de clientes (nombre, cédula, dirección, garante)
- **ventas**: Registra los préstamos con información de financiamiento (monto, cuotas, saldo pendiente)
- **pagos**: Registra los pagos realizados por los clientes

## 📁 Estructura del Proyecto

```
├── app/                    # App Router de Next.js
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Dashboard principal
│   ├── clientes/          # Gestión de clientes
│   ├── ventas/            # Gestión de préstamos
│   └── pagos/             # Gestión de pagos
├── components/            # Componentes reutilizables
│   ├── forms/             # Formularios validados
│   └── ...
├── lib/                   # Utilidades y servicios
│   ├── services/          # Servicios de base de datos
│   └── supabase.ts        # Cliente de Supabase
├── types/                 # Tipos TypeScript
├── public/                # Archivos estáticos
│   ├── manifest.json      # Manifest de PWA
│   └── sw.js             # Service Worker
└── supabase/             # Scripts SQL
    └── schema.sql        # Esquema de base de datos
```

## 🎨 Tecnologías Utilizadas

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **React Hook Form** + **Zod** (Validación de formularios)
- **Lucide React** (Iconos)
- **date-fns** (Manejo de fechas)

## 📝 Funcionalidades Principales

### Dashboard
- Muestra motores disponibles
- Total por cobrar
- Ventas del mes
- Lista de ventas recientes

### Gestión de Motores
- Crear, editar y eliminar motores
- Ver estado (Disponible/Vendido)
- Filtrar motores disponibles

### Gestión de Clientes
- CRUD completo de clientes
- Información de garante incluida

### Ventas
- Crear ventas asignando motor y cliente
- Configurar cantidad de cuotas
- Cálculo automático de valores
- Cambio automático de estado del motor a "Vendido"

### Pagos
- Registrar pagos por venta
- Deducción automática del saldo pendiente
- Historial de pagos
- Validación de montos

### Facturas
- Vista optimizada para impresión
- Incluye todos los detalles de la venta
- Historial de pagos
- Resumen de saldo pendiente

## 🚢 Despliegue

### Vercel (Recomendado)

1. Conectar el repositorio a Vercel
2. Agregar las variables de entorno en la configuración
3. Desplegar automáticamente

### Otros servicios

La aplicación puede desplegarse en cualquier servicio que soporte Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 🔒 Seguridad

- Las credenciales de Supabase deben mantenerse seguras
- Considerar habilitar Row Level Security (RLS) en Supabase para producción
- Ajustar las políticas de acceso según necesidades

## 📄 Licencia

Este proyecto es privado y está destinado para uso exclusivo de JASICORPORATIONS GESTION DE PRESTAMOS.

## 🤝 Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.

---

Desarrollado con ❤️ para JASICORPORATIONS GESTION DE PRESTAMOS




