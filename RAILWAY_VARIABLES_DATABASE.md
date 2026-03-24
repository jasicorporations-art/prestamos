# Variables DATABASE_URL y DIRECT_URL en Railway (error P1013)

Si ves **"The scheme is not recognized in database URL"** (P1013), la URL está mal formada en Railway.

## Formato correcto

En Railway → **Variables**, cada variable debe tener **solo** la URL, **sin comillas** y **sin espacios**:

### DATABASE_URL
```
postgresql://postgres:PRESTAMOSjasi@db.ganrgbdkzxktuymxdmzf.supabase.co:5432/postgres?sslmode=require
```

### DIRECT_URL
```
postgresql://postgres:PRESTAMOSjasi@db.ganrgbdkzxktuymxdmzf.supabase.co:5432/postgres?sslmode=require
```

(Sin `sslmode=require`, Supabase suele rechazar la conexión desde Railway → error P1001.)

## Errores frecuentes

| Error | Solución |
|-------|----------|
| Pones **comillas** en el valor: `"postgresql://..."` | Borra las comillas. El valor debe ser solo `postgresql://postgres:...` |
| Empieza por `postgres://` (una sola 'l') | Prisma acepta ambos, pero si falla, usa `postgresql://` (con **ql**) |
| Espacios al inicio o al final | Copia/pega de nuevo sin espacios |
| Saltos de línea dentro del valor | Una sola línea |
| Variable vacía o nombre distinto | Nombre exacto: `DATABASE_URL` y `DIRECT_URL` |

## Cómo corregir en Railway

1. Railway → proyecto **prestamo** → tu servicio → **Variables**.
2. Edita **DATABASE_URL**: pega solo esto (sin comillas), **con** `?sslmode=require` al final:
   ```
   postgresql://postgres:PRESTAMOSjasi@db.ganrgbdkzxktuymxdmzf.supabase.co:5432/postgres?sslmode=require
   ```
3. Edita **DIRECT_URL**: pega exactamente lo mismo.
4. Guarda. Railway reiniciará el servicio (puede tardar 1–2 min). Si no reinicia, en **Deployments** → ⋮ del último deploy → **Redeploy**.

Si tu contraseña de Supabase es otra, sustituye `PRESTAMOSjasi` por tu contraseña. Si tiene caracteres raros (`@`, `#`, `%`, etc.), codifícalos (ej. `@` → `%40`).

---

## Error P1001: "Can't reach database server"

Si la URL está bien pero ves **P1001**:

1. **Añade `?sslmode=require`** al final de ambas URLs (arriba ya lo llevan). Sin SSL, Supabase suele rechazar conexiones remotas.
2. **Proyecto pausado**: En Supabase → Dashboard, si el proyecto está en pausa (plan free por inactividad), reactívalo.
3. **Restricciones de red**: En Supabase → Settings → Database, revisa si hay "Restrict connections" o lista de IPs; para Railway hay que permitir conexiones desde cualquier IP o añadir las IPs de Railway si las ofrece Supabase.
