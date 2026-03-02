# Migraciones Prisma + Railway

## Estructura creada

- `migration_lock.toml` – bloquea el proveedor a PostgreSQL.
- `0_init/` – migración baseline (estado actual de la DB: auth + public).

Tu base en Supabase **ya tiene** esas tablas, por eso no debemos ejecutar el SQL de `0_init` en producción; solo hay que marcar la migración como aplicada (baseline).

---

## 1. Hacer baseline en Supabase (una sola vez)

Desde la raíz del proyecto, con `.env` o `.env.local` apuntando a tu Supabase:

```powershell
npx prisma migrate resolve --applied 0_init
```

Eso registra `0_init` en la tabla `_prisma_migrations` **sin ejecutar** el SQL. A partir de ahí, `prisma migrate deploy` considerará esa migración ya aplicada.

---

## 2. Railway: variables y comando de migración

En el proyecto de Railway → **Variables**, define:

- `DATABASE_URL` – conexión a Postgres (la que uses en producción).
- `DIRECT_URL` – misma URL directa (Prisma usa `directUrl` para migraciones).

En **Settings** del servicio:

- **Build Command:**  
  `npm install && npx prisma generate && npm run build`  
  (o el que uses; lo importante es que incluya `npx prisma generate`).

- **Release Command** (si Railway lo muestra):  
  `npx prisma migrate deploy`  
  Así cada deploy aplica solo las migraciones pendientes.

Si no hay “Release Command”, puedes ejecutar migraciones antes del start, por ejemplo en **Start Command:**  
`npx prisma migrate deploy && npm run start`

---

## 3. Comandos útiles

| Comando | Uso |
|--------|-----|
| `npm run db:migrate` | Aplica migraciones pendientes (`prisma migrate deploy`). |
| `npx prisma migrate resolve --applied 0_init` | Marcar baseline (solo una vez en Supabase). |
| `npx prisma migrate dev --name nombre` | Crear nueva migración en desarrollo. |

---

## 4. Resumen

1. Ejecutar **una vez** en local (con DB Supabase):  
   `npx prisma migrate resolve --applied 0_init`
2. En Railway: tener `DATABASE_URL` y `DIRECT_URL` y usar `npx prisma migrate deploy` en release o antes de `start`.
3. Subir la carpeta `prisma/migrations` a Git para que Railway tenga el historial de migraciones.
