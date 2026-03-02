# 🖥️ Cómo Ver la Interfaz de la Aplicación

## ✅ Servidor en Ejecución

El servidor de desarrollo está corriendo. Para ver la aplicación:

### Paso 1: Abrir en el Navegador

1. Abre tu navegador (Chrome, Edge, Firefox, etc.)
2. Ve a la siguiente dirección:
   ```
   http://localhost:3000
   ```

### Paso 2: Ver la Interfaz

Deberías ver:
- ✅ El Dashboard principal
- ✅ La navegación superior con los menús
- ✅ Las diferentes secciones (Motores, Clientes, Ventas, Pagos)

## ⚠️ Nota Importante

**Sin configurar Supabase**, podrás ver la interfaz pero:
- ❌ No podrás crear, editar o eliminar datos
- ❌ Verás errores al intentar usar las funcionalidades
- ✅ Pero podrás ver cómo se ve la aplicación

## 🔧 Para que Todo Funcione

Necesitas configurar Supabase:

1. **Crear cuenta en Supabase:**
   - Ve a https://supabase.com
   - Crea una cuenta gratuita
   - Crea un nuevo proyecto

2. **Ejecutar el esquema SQL:**
   - En Supabase, ve a "SQL Editor"
   - Abre el archivo `supabase/schema.sql`
   - Copia y pega el contenido
   - Ejecuta el script

3. **Obtener credenciales:**
   - Ve a Settings > API
   - Copia la "Project URL"
   - Copia la "anon public" key

4. **Configurar .env.local:**
   - Abre el archivo `.env.local`
   - Pega tus credenciales:
     ```
     NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
     NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
     ```

5. **Reiniciar el servidor:**
   - En la terminal donde está corriendo, presiona `Ctrl + C`
   - Ejecuta nuevamente: `npm.cmd run dev`

## 🚀 Comandos Útiles

### Ver el servidor corriendo:
```powershell
# El servidor ya está corriendo en segundo plano
# Solo abre http://localhost:3000 en tu navegador
```

### Detener el servidor:
```powershell
# Presiona Ctrl + C en la terminal donde está corriendo
```

### Reiniciar el servidor:
```powershell
$env:PATH += ";C:\Program Files\nodejs"
npm.cmd run dev
```

## 📱 Ver en Móvil (Misma Red)

Si quieres ver la aplicación en tu móvil:

1. Encuentra la IP de tu computadora:
   ```powershell
   ipconfig
   # Busca "IPv4 Address" (ej: 192.168.1.100)
   ```

2. En tu móvil, abre:
   ```
   http://TU_IP:3000
   # Ejemplo: http://192.168.1.100:3000
   ```

## ✅ Verificación

Si todo está bien, deberías ver:
- ✅ La página carga sin errores
- ✅ El menú de navegación funciona
- ✅ Puedes navegar entre secciones
- ✅ Los formularios se muestran correctamente

---

**¡Abre http://localhost:3000 ahora para ver tu aplicación!** 🎉



