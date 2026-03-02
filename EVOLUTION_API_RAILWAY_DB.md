# Evolution API en Railway: error "Can't reach database server at postgres:5432"

Los logs son del servicio **Evolution API** (evolution-api@2.3.7), no del proyecto prestamos.  
Evolution API intenta hacer migraciones con Prisma y se conecta a **postgres:5432** (host de Docker) en lugar de tu Supabase.

## Qué está pasando

- Railway **sí** está pasando bien la variable: en el log aparece  
  `Database URL: postgresql://postgres:PRESTAMOSjasi@db.ganrgbdkzxktuymxdmzf.supabase.co:5432/postgres`
- Pero Prisma dice:  
  `Datasource "db": ... at **postgres:5432**`  
  Es decir, el **schema de Prisma** que usa Evolution API no está usando esa URL y usa el host por defecto `postgres:5432`.

## Dónde corregirlo

Hay que tocar el **proyecto/código de Evolution API** que despliegas en Railway (no este repo prestamos).

### Opción A: Tienes el código de Evolution API (fork o repo propio)

1. Abre el repo de Evolution API que usas en Railway.
2. Localiza el schema de Prisma que se usa para PostgreSQL, por ejemplo:
   - `prisma/postgresql-schema.prisma`
   - o algo como `prisma/DATABASE_PROVIDER-schema.prisma` (con provider postgresql).
3. En el `datasource db` asegúrate de que la URL salga **solo** de la variable de entorno:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

   No debe haber `host = "postgres"` ni `url` fija a `postgres:5432` ni a `evolution_db` en ese archivo.
4. Si hay un `.env` o `.env.example` en ese repo con algo como  
   `DATABASE_URL=postgresql://postgres:5432/evolution_db`,  
   no subas ese `.env` al build de Railway (o no lo uses en producción). En Railway la URL debe venir solo de las **Variables** del servicio.
5. Vuelve a desplegar Evolution API en Railway.

### Opción B: Usas imagen oficial de Evolution API (sin tocar código)

- Algunas imágenes leen `DATABASE_URL`; otras esperan `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, etc.
- En el **servicio de Evolution API** en Railway → **Variables**:
  - Pon **DATABASE_URL** con tu URL completa de Supabase, por ejemplo:  
    `postgresql://postgres:PRESTAMOSjasi@db.ganrgbdkzxktuymxdmzf.supabase.co:5432/postgres`
  - Si la documentación de Evolution API pide variables separadas, rellena por ejemplo:
    - **DATABASE_HOST** = `db.ganrgbdkzxktuymxdmzf.supabase.co`
    - **DATABASE_PORT** = `5432`
    - **DATABASE_USER** = `postgres`
    - **DATABASE_PASSWORD** = tu contraseña
    - **DATABASE_NAME** = `postgres` (o el nombre de base que uses en Supabase)
- Si la imagen usa un `.env` interno con `postgres:5432`, a veces se puede sobrescribir con **DATABASE_URL** con mayor prioridad. Prueba solo con **DATABASE_URL** primero.
- Si sigue usando `postgres:5432`, tendrás que usar un fork/imagen que respete **DATABASE_URL** o desplegar Evolution API desde un repo donde tú controles el schema de Prisma (Opción A).

### Opción C: Base de datos en Railway (sin Supabase para Evolution API)

- En el mismo proyecto de Railway, añade un **Postgres** (plugin o servicio).
- Railway te dará una URL tipo `postgresql://postgres:...@...railway.app:5432/railway`.
- En el servicio de **Evolution API** pon **DATABASE_URL** a esa URL de Railway.
- Así el host ya no es `postgres:5432` de Docker sino la base de Railway.  
  (Supabase puedes seguir usándola solo para la app prestamos.)

## Resumen

- El fallo es de **Evolution API** en Railway: Prisma usa `postgres:5432` en vez de tu Supabase.
- Tienes que hacer que el **schema de Prisma** (o la config de la imagen) use **DATABASE_URL** que apunte a Supabase (o a una Postgres de Railway), y que en Railway esa variable esté definida y no sea sobrescrita por un `.env` con `postgres:5432`.
