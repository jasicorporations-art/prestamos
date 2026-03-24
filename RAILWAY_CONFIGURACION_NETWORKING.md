# Configuración Railway – No puedo entrar a la página (prestamos-production)

Si no puedes acceder a **https://prestamos-production-9fee.up.railway.app** (o tu dominio), revisa lo siguiente.

---

## 1. Puerto correcto en Networking (muy importante)

La app Next.js escucha en el puerto **3000** (o en la variable `PORT` que inyecta Railway).

En Railway:

1. Ve a tu servicio **prestamos**.
2. Pestaña **Networking** (o **Settings** → sección de red).
3. En **Public Networking** > **Access your application over HTTP**:
   - Haz clic en **Edit Port** (junto al dominio).
   - **Target port:** pon **3000**.
   - Guarda con **Update**.

Si el puerto está vacío o en otro valor (por ejemplo 8080), Railway enviará el tráfico a un puerto donde la app no escucha y verás error de conexión o “Cannot GET /”.

---

## 2. Variables de entorno

En **Variables** del servicio, asegúrate de tener al menos:

| Variable | Uso |
|----------|-----|
| `PORT` | Railway suele inyectarla; si no, pon `3000`. |
| `DATABASE_URL` | URL de Supabase (Prisma). Ej: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase. |

(Opcional: `SUPABASE_SERVICE_ROLE_KEY` si la app la usa en API routes.)

Sin `DATABASE_URL` correcta, la app puede fallar al arrancar (Prisma/migraciones) y el despliegue quedará en crash antes de atender peticiones.

---

## 3. Despliegue con Dockerfile

Este proyecto usa **Dockerfile**. En Railway:

- **Build**: debe usar el Dockerfile (Builder: Dockerfile, path: `Dockerfile`).
- **Start**: lo define el Dockerfile (`CMD ["./railway-start.sh"]`). No hace falta repetir el comando en Railway si ya usas el Dockerfile; el script arranca Next.js en `$PORT` (por defecto 3000).

No es necesario configurar “Custom Start Command” en Railway cuando el inicio ya está en el Dockerfile.

---

## 4. Comprobar que la app arranca

En Railway → **Deployments** → último despliegue → **View Logs**.

Deberías ver algo como:

```text
======== NEXT.JS STARTING (PORT=3000) ========
```

y luego que Next.js está escuchando. Si ves errores de Prisma, `DATABASE_URL` o “EADDRINUSE”, ahí está el fallo.

---

## Resumen rápido

1. **Networking** → dominio → **Edit Port** → **3000** → **Update**.
2. **Variables**: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (y `PORT=3000` si hace falta).
3. Revisar **Logs** del último deployment para ver si la app arranca y en qué puerto.

Después de guardar el puerto 3000 y redeployar si fue necesario, prueba de nuevo: **https://prestamos-production-9fee.up.railway.app**.
