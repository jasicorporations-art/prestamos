# 📄 Diferencia: demo.html vs Aplicación Real

## 🎨 demo.html (Solo Visualización)

El archivo `demo.html` es **solo una demostración visual**:
- ✅ Muestra cómo se ve la interfaz
- ✅ Tiene datos de ejemplo
- ✅ Los formularios se ven pero **NO guardan datos reales**
- ❌ **NO se conecta a Supabase**
- ❌ Los datos que "agregues" **NO se guardan**

**Para abrir demo.html:**
- Haz doble clic en el archivo `demo.html`
- O ábrelo desde el navegador (Archivo > Abrir)

## 🚀 Aplicación Real (Next.js con Supabase)

La aplicación real está en **Next.js** y **SÍ guarda datos en Supabase**:
- ✅ Se conecta a Supabase
- ✅ Guarda datos reales en la base de datos
- ✅ Los motores, clientes, ventas y pagos se guardan realmente
- ✅ Funciona como PWA

**Para usar la aplicación real:**

1. **Reinicia el servidor:**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   npm.cmd run dev
   ```

2. **Abre en el navegador:**
   - Ve a: `http://localhost:3000`

3. **Ahora SÍ puedes agregar motores y clientes** que se guardarán en Supabase

## 📋 Resumen

| Característica | demo.html | Aplicación Real (localhost:3000) |
|---------------|-----------|----------------------------------|
| Ver interfaz | ✅ | ✅ |
| Datos de ejemplo | ✅ | ❌ (vacía al inicio) |
| Guardar datos | ❌ | ✅ |
| Conecta a Supabase | ❌ | ✅ |
| Funciona como PWA | ❌ | ✅ |

## 🎯 Para Agregar Motores/Clientes Realmente

**NO uses demo.html** - usa la aplicación Next.js:

1. **Asegúrate de que el servidor está corriendo:**
   ```powershell
   npm.cmd run dev
   ```

2. **Abre:** `http://localhost:3000`

3. **Ve a "Motores" o "Clientes"**

4. **Haz clic en "Nuevo Motor" o "Nuevo Cliente"**

5. **Completa el formulario y guarda**

6. **Verifica en Supabase:**
   - Ve a Table Editor
   - Deberías ver los datos que creaste

---

**¿Quieres que te ayude a iniciar el servidor de Next.js para usar la aplicación real?** 🚀



