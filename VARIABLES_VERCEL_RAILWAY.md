# Variables: Vercel vs Railway

Tu app puede estar en **Vercel** y en **Railway**. Cada uno tiene su propio panel de Variables. Estas son las que necesita la app y cómo ponerlas para que **no rompan el deploy**.

---

## Variables que SÍ debes tener en Vercel (si la app corre ahí)

Las mismas que usa la app en producción, pero **solo las que Vercel necesita**:

| Variable | ¿En Vercel? | Notas |
|----------|-------------|--------|
| **NEXT_PUBLIC_SUPABASE_URL** | Sí | URL del proyecto Supabase (ej. `https://ganrgbdkzxktuymxdmzf.supabase.co`) |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Sí | Clave anon (la pública) |
| **SUPABASE_SERVICE_ROLE_KEY** | Sí | Clave secreta; en Vercel márcala como **Sensitive** |
| **DATABASE_URL** | Solo si usas Prisma en Vercel | Misma URL que en Railway (pooler con `?sslmode=require`) |
| **DIRECT_URL** | Solo si usas Prisma en Vercel | Misma URL que en Railway (pooler Session con `?sslmode=require`) |
| Otras (RESEND, STRIPE, etc.) | Si la app las usa | Igual que en .env.local |

**No pongas en Vercel** variables que solo tenga Railway (por ejemplo algo específico de Railway).  
**No copies** variables de **build de Docker** que solo sirven para Railway (las del Dockerfile).

---

## Por qué Vercel puede fallar al agregar variables

1. **Comillas en el valor**  
   En Vercel el valor debe ser **sin comillas**.  
   - Mal: `"postgresql://postgres:..."`  
   - Bien: `postgresql://postgres:...`

2. **Caracteres especiales en la URL**  
   Si pegas una URL con `&` (ej. `?sslmode=require&pgbouncer=true`), en algunos sitios hay que tener cuidado. En Vercel suele ir bien pegando la URL completa en el campo de valor, **sin** comillas.

3. **Espacios o saltos de línea**  
   Un espacio al inicio/final o un Enter en medio del valor puede romper la variable. Pega el valor en una sola línea, sin espacios extra.

4. **Demasiadas variables de golpe**  
   Si añadiste muchas y el deploy empezó a fallar, quita las que no sean imprescindibles (por ejemplo deja solo Supabase y Prisma), haz deploy, y luego añade el resto de una en una.

5. **Build que usa la DB**  
   Si el **build** de Vercel ejecuta algo que conecta a la base de datos (por ejemplo `prisma migrate deploy` en el build), y la URL no es correcta o no es alcanzable desde Vercel, el build falla. En Vercel lo normal es **no** correr migraciones en el build; solo `prisma generate` y `next build`. Las variables de DB se usan en **runtime**, no en build.

---

## Cómo añadirlas en Vercel sin que falle el deploy

1. **Vercel** → tu proyecto → **Settings** → **Environment Variables**.
2. Añade **una por una**.
3. **Name**: exacto (ej. `NEXT_PUBLIC_SUPABASE_URL`).
4. **Value**: pega solo el valor, **sin comillas**, una sola línea, sin espacios al inicio/final.
5. Para claves secretas (SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET, etc.) marca **Sensitive**.
6. Guarda y haz **Redeploy** (no hace falta tocar código).

Empieza solo con:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Si el deploy pasa, añade después `DATABASE_URL` y `DIRECT_URL` (si usas Prisma en esa app en Vercel), con el mismo formato que en Railway (pooler + `?sslmode=require`).

---

## Resumen

- **Vercel** y **Railway** tienen cada uno sus Variables; no se copian solas.
- En **Vercel** pon las mismas que necesita la app (Supabase, y si aplica Prisma/DB), **sin comillas** y sin espacios/saltos de línea.
- Si antes fallaba al poner variables, suele ser por comillas, formato de URL o por ejecutar migraciones/DB en el build; corrige eso y despliega de nuevo.
