# ⚠️ Instrucciones Claras - NO Pegues Ambos Archivos

## ❌ Error Común

Si pegaste `EJECUTAR_ESTE_SQL.sql` junto con `schema.sql`, eso causará el error porque ambos intentan crear los mismos triggers.

## ✅ Solución Correcta

### Opción 1: Solo Ejecuta el Script de Corrección (Recomendado)

1. **Abre el archivo `SOLO_EJECUTA_ESTO.sql`** que acabo de crear
2. **Copia TODO su contenido** (solo ese archivo, nada más)
3. **En Supabase SQL Editor:**
   - Limpia todo lo que haya en el editor
   - Pega SOLO el contenido de `SOLO_EJECUTA_ESTO.sql`
   - Haz clic en **"Run"**

4. **Deberías ver:** "Success. No rows returned" ✅

### Opción 2: Verificar que las Tablas Existen

**El error del trigger NO impide que la aplicación funcione.**

1. **Ve a Table Editor en Supabase**
2. **Verifica que existen estas 4 tablas:**
   - ✅ `motores`
   - ✅ `clientes`
   - ✅ `ventas`
   - ✅ `pagos`

3. **Si las 4 tablas existen**, ya está todo listo. Puedes ignorar el error del trigger.

## 🚀 Próximo Paso: Probar la Aplicación

**No necesitas esperar a solucionar el error del trigger.** Si las tablas existen, ya puedes usar la aplicación.

1. **Reinicia el servidor:**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   npm.cmd run dev
   ```

2. **Abre la aplicación:**
   - Ve a `http://localhost:3000`

3. **Prueba crear un motor:**
   - Haz clic en "Motores" > "Nuevo Motor"
   - Completa el formulario
   - Guarda

4. **Verifica en Supabase:**
   - Ve a Table Editor > `motores`
   - Deberías ver el motor que creaste

---

**¿Puedes verificar en Table Editor si las 4 tablas existen? Si sí, ya puedes usar la aplicación sin problemas.** ✅



