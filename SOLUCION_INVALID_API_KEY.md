# 🔧 Solución: Invalid API Key

## 🔍 Problema

El error "Invalid API key" generalmente ocurre cuando:
1. La URL de Supabase no coincide con la clave anónima
2. La clave tiene espacios o caracteres extra
3. La clave está mal copiada

## ✅ Solución

### Paso 1: Verificar la URL de Supabase

Basándote en tu clave anónima, el proyecto es: **`kpqvzkgsbawfqdsxjdjc`**

Por lo tanto, la URL debe ser:
```
https://kpqvzkgsbawfqdsxjdjc.supabase.co
```

### Paso 2: Actualizar la URL en Vercel

1. Ve a: https://vercel.com/johns-projects-9d4c1d75/.cursor/settings/environment-variables

2. Busca la variable `NEXT_PUBLIC_SUPABASE_URL`

3. Haz clic en el icono de **editar** (lápiz) o en el nombre de la variable

4. Verifica que el valor sea exactamente:
   ```
   https://kpqvzkgsbawfqdsxjdjc.supabase.co
   ```

5. Si tiene otro valor (como `https://ganrgbdkzxktuymxdmzf.supabase.co`), cámbialo

6. Haz clic en **Save**

### Paso 3: Verificar la Clave Anónima

1. En la misma página, busca `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Haz clic en **editar**

3. Verifica que la clave sea exactamente:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng
   ```

4. **IMPORTANTE:** Asegúrate de que:
   - No haya espacios al inicio o al final
   - No haya saltos de línea
   - Esté completa (debe terminar en `...vbng`)

5. Si necesitas copiarla de nuevo, ve a:
   https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/settings/api

6. Haz clic en **Save**

### Paso 4: Volver a Desplegar

Después de actualizar las variables, vuelve a desplegar:

**Opción A: Desde Vercel Dashboard**
1. Ve a "Deployments"
2. Haz clic en "Redeploy" en el último deployment
3. Espera a que termine

**Opción B: Desde la Terminal**
```powershell
$env:PATH += ";C:\Users\Owner\AppData\Roaming\npm"
vercel --prod
```

## 🔍 Verificación Final

Después del redeploy, verifica:

1. Abre: https://cursor-nu-black.vercel.app
2. Deberías ver la página de login (sin errores)
3. Si aún ves "Invalid API key", verifica:
   - Que la URL sea exactamente `https://kpqvzkgsbawfqdsxjdjc.supabase.co`
   - Que la clave no tenga espacios
   - Que ambas variables estén marcadas para Production, Preview y Development

## 🆘 Si Aún No Funciona

1. **Verifica en Supabase:**
   - Ve a: https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/settings/api
   - Copia nuevamente la URL y la clave "anon public"
   - Asegúrate de estar en el proyecto correcto

2. **Elimina y vuelve a crear las variables:**
   - En Vercel, elimina ambas variables
   - Vuelve a crearlas con los valores correctos
   - Vuelve a desplegar





