# 🚀 Cómo Ejecutar la Aplicación - Paso a Paso

## ✅ Checklist de Requisitos

Antes de ejecutar, verifica que tienes:

- [x] Node.js instalado
- [x] Dependencias instaladas (node_modules existe)
- [x] Archivo .env.local creado con credenciales de Supabase
- [ ] Tablas creadas en Supabase (motores, clientes, ventas, pagos)
- [ ] Servidor Next.js corriendo

## 📋 Pasos para Ejecutar

### Paso 1: Verificar que Todo Está Listo

1. **Verifica que las dependencias están instaladas:**
   - Debe existir la carpeta `node_modules`
   - Si no existe, ejecuta: `npm.cmd install`

2. **Verifica que .env.local existe:**
   - Debe estar en la raíz del proyecto
   - Debe tener tus credenciales de Supabase

3. **Verifica que las tablas existen en Supabase:**
   - Ve a Table Editor en Supabase
   - Deben existir: `motores`, `clientes`, `ventas`, `pagos`

### Paso 2: Iniciar el Servidor

1. **Abre PowerShell en la carpeta del proyecto**

2. **Agrega Node.js al PATH (si es necesario):**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   ```

3. **Inicia el servidor:**
   ```powershell
   npm.cmd run dev
   ```

4. **Espera a que inicie:**
   - Verás: `✓ Ready in X seconds`
   - Verás: `○ Local: http://localhost:3000`

### Paso 3: Abrir la Aplicación

1. **Abre tu navegador** (Chrome, Edge, Firefox)

2. **Ve a:**
   ```
   http://localhost:3000
   ```

3. **Deberías ver:**
   - El Dashboard
   - El menú de navegación
   - Las diferentes secciones

### Paso 4: Probar Funcionalidades

1. **Crear un Motor:**
   - Haz clic en "Motores"
   - Haz clic en "Nuevo Motor"
   - Completa el formulario
   - Guarda

2. **Crear un Cliente:**
   - Haz clic en "Clientes"
   - Haz clic en "Nuevo Cliente"
   - Completa el formulario
   - Guarda

3. **Verificar en Supabase:**
   - Ve a Table Editor en Supabase
   - Deberías ver los datos que creaste

## 🆘 Si Hay Problemas

### Error: "Cannot find module"
```powershell
npm.cmd install
```

### Error: "Supabase credentials not found"
- Verifica que `.env.local` existe
- Verifica que tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Reinicia el servidor después de crear/modificar `.env.local`

### Error al crear datos
- Verifica que las tablas existen en Supabase
- Verifica que ejecutaste el schema.sql
- Revisa la consola del navegador (F12) para ver errores

### El servidor no inicia
- Verifica que Node.js está instalado: `node --version`
- Verifica que estás en la carpeta correcta (donde está package.json)
- Intenta eliminar `.next` y reinstalar: 
  ```powershell
  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
  npm.cmd install
  npm.cmd run dev
  ```

## ✅ Comandos Rápidos

```powershell
# Agregar Node.js al PATH
$env:PATH += ";C:\Program Files\nodejs"

# Instalar dependencias
npm.cmd install

# Iniciar servidor
npm.cmd run dev

# Detener servidor
# Presiona Ctrl + C en la terminal
```

## 🎯 Resumen

1. ✅ Verifica que todo está listo
2. ✅ Ejecuta: `npm.cmd run dev`
3. ✅ Abre: `http://localhost:3000`
4. ✅ Prueba crear un motor o cliente

---

**¿Quieres que te ayude a iniciar el servidor ahora?** 🚀

