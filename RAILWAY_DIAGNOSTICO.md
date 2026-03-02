# Cómo ver el error exacto en Railway y soluciones frecuentes

## 1. Dónde ver el error

- En el proyecto de **Railway** → tu **servicio** → pestaña **Deployments**.
- Abre el **último deployment** (el que falla).
- Ahí verás:
  - **Build Logs**: errores durante `npm install` / `npm run build`.
  - **Deploy Logs** (o **Runtime Logs**): errores al arrancar la app o al ejecutar `prisma migrate deploy`.

Copia **el mensaje de error completo** (las últimas 20–30 líneas donde aparece el fallo) y compártelo para poder afinar la solución.

---

## 2. Configuración que ya tienes en el proyecto

- **Build:** `prisma generate` se ejecuta dentro de `npm run build` (en `package.json`).
- **Start:** `next start -H 0.0.0.0` para escuchar en todas las interfaces (Railway asigna el puerto con la variable `PORT`).
- **railway.toml:**  
  - Build: `npm install && npm run build`  
  - Start: `npx prisma migrate deploy && npm run start`

En Railway → **Variables** deben estar definidas:

- `DATABASE_URL`
- `DIRECT_URL`
- Las que use tu app (por ejemplo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).

---

## 3. Errores frecuentes y qué hacer

| Síntoma | Qué revisar |
|--------|-------------|
| **Build falla** (ej. "Cannot find module '@prisma/client'") | En **Build Command** debe ejecutarse `prisma generate` antes de `next build`. Ya está en `package.json` (`"build": "prisma generate && next build"`). Si en Railway tienes un **Build Command** custom, que sea: `npm install && npm run build`. |
| **502 Bad Gateway** o "Application failed to respond" | La app debe escuchar en el **puerto** que asigna Railway (`PORT`). El script de start ya usa `next start -H 0.0.0.0`; Next.js usa `process.env.PORT` automáticamente. No hace falta poner `-p` a mano. |
| **"Environment variable not found: DATABASE_URL"** | En Railway → servicio → **Variables** → añade `DATABASE_URL` y `DIRECT_URL` (mismo valor que en `.env.railway`). |
| **"P1001: Can't reach database server"** o **"Authentication failed"** | Revisa que `DATABASE_URL` y `DIRECT_URL` en Railway sean las mismas que en Supabase (Settings → Database). Comprueba usuario/contraseña y que no haya restricción de IP que bloquee a Railway. |
| **"Migration failed"** o errores en `prisma migrate deploy` | La primera vez debiste marcar el baseline en Supabase: `npx prisma migrate resolve --applied 0_init`. Si ya lo hiciste, revisa que `DIRECT_URL` en Railway sea la URL **directa** (puerto 5432), no la del pooler. |
| **No start command / crash al iniciar** | En Railway → **Settings** → **Deploy** verifica que **Start Command** esté vacío (para usar `railway.toml`) o sea: `npx prisma migrate deploy && npm run start`. |

---

## 4. Si sigues con error

1. Copia **el mensaje de error exacto** de **Build Logs** o **Deploy Logs** (donde falle).
2. Indica **en qué paso falla**: build (instalación/compilación) o al arrancar (después del build).
3. Con eso se puede indicar el cambio concreto (variable, comando o código).
