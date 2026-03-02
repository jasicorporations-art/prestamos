# Prisma + Supabase + Railway – Pasos seguros

Ejecuta estos pasos en orden. No modifica código de producción; solo instala/actualiza Prisma, genera el cliente y sincroniza el esquema.

---

## Lo que ya está hecho en el proyecto

- **Scripts en `package.json`:** `prisma:generate` y `prisma:pull`.
- **Instalación:** `prisma` y `@prisma/client` 5.22.0 instalados con `--legacy-peer-deps`.
- **Caché:** `npm cache verify` ejecutado.
- **Cliente generado:** `npx prisma generate` ejecutado correctamente.
- **`db pull`:** Debe ejecutarse desde tu PC o desde un entorno que pueda conectar a Supabase (si falla "Can't reach database server", revisa SSL y red más abajo).

---

## 1. Limpiar caché de npm (opcional, si has tenido errores)

```powershell
cd "C:\Users\Owner\Documents\prestamos.jasicorporations.com"
npm cache verify
```

Si algo falló antes con Prisma:

```powershell
npm cache clean --force
```

---

## 2. Instalar Prisma de forma segura

```powershell
cd "C:\Users\Owner\Documents\prestamos.jasicorporations.com"
npm install prisma@5.22.0 @prisma/client@5.22.0 --save --legacy-peer-deps
```

- `--legacy-peer-deps` evita conflictos con otras dependencias sin romper npm.
- Si ya están instalados, npm solo verificará versiones.

---

## 3. Variables de entorno

Asegúrate de tener en **`.env`** (Prisma CLI solo lee `.env`, no `.env.local`):

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.ganrgbdkzxktuymxdmzf.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:TU_PASSWORD@db.ganrgbdkzxktuymxdmzf.supabase.co:5432/postgres"
```

- Para Supabase suele ser necesario SSL. Si `prisma db pull` falla con "Can't reach database server", añade a la URL: **`?sslmode=require`** (en `DIRECT_URL` para pull/migrate).
- Ejemplo: `DIRECT_URL="postgresql://...supabase.co:5432/postgres?sslmode=require"`

---

## 4. Generar el cliente Prisma

```powershell
cd "C:\Users\Owner\Documents\prestamos.jasicorporations.com"
npx prisma generate
```

O con el script:

```powershell
npm run prisma:generate
```

Debe terminar con: `Generated Prisma Client ... to .\node_modules\@prisma\client`.

---

## 5. Sincronizar esquema con Supabase (db pull)

Esto **sobrescribe** `prisma/schema.prisma` con las tablas reales de tu base de datos. Haz backup si has editado el schema a mano.

```powershell
cd "C:\Users\Owner\Documents\prestamos.jasicorporations.com"
npx prisma db pull
```

O:

```powershell
npm run prisma:pull
```

Luego vuelve a generar el cliente:

```powershell
npm run prisma:generate
```

---

## 6. Verificar conexión desde Railway

En Railway no puedes ejecutar `prisma db pull` de forma interactiva; la verificación se hace en runtime.

**Opción A – Variables en Railway**

En el proyecto de Railway → **Variables**:

- `DATABASE_URL` = misma URL de Postgres (o pooler si usas Supabase pooler).
- `DIRECT_URL` = URL directa (puerto 5432).

**Opción B – Verificar en build/deploy**

En el **Build Command** o en un script de inicio puedes probar la conexión:

```powershell
npx prisma generate
```

Si el build pasa y tu app usa `prisma` en API routes o Server Components sin errores de conexión, la DB es alcanzable desde Railway.

**Opción C – Comando de verificación local con las mismas URLs**

Crea un `.env.railway` (o usa las variables de Railway en local temporalmente) y ejecuta:

```powershell
npx prisma db pull
```

Si `db pull` termina sin error, esa combinación de `DATABASE_URL` / `DIRECT_URL` es válida y funcionará en Railway con la misma configuración.

---

## Resumen de scripts en package.json

| Script              | Comando real        | Uso                          |
|---------------------|---------------------|------------------------------|
| `npm run prisma:generate` | `prisma generate`   | Generar cliente después de cambiar schema o después de pull |
| `npm run prisma:pull`     | `prisma db pull`    | Sincronizar schema con Supabase (sobrescribe schema.prisma) |

---

## Si algo falla

- **"Environment variable not found: DATABASE_URL"** o **"DIRECT_URL"**  
  Prisma solo lee **`.env`** en la raíz. Añade ahí `DATABASE_URL` y `DIRECT_URL` (puedes copiarlos desde `.env.local`).

- **"Can't reach database server"**  
  - Añade **`?sslmode=require`** al final de `DIRECT_URL` (y a `DATABASE_URL` si hace falta).  
  - Revisa en Supabase: **Settings → Database → Connection string** y que tu IP esté permitida en **Network** (o usa "Allow all" en desarrollo).  
  - Si estás en una red corporativa o VPN, prueba desde otra red o desde Railway (deploy); en Railway la conexión suele funcionar si las variables están bien.

- **npm en estado raro**  
  Ejecuta `npm cache verify`, luego `rm -r node_modules` (o borra la carpeta a mano), borra `package-lock.json` solo si estás dispuesto a regenerarlo, y vuelve a ejecutar `npm install`.
