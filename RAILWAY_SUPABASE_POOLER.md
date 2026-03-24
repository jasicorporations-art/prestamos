# Solución P1001: usar Connection Pooler de Supabase (IPv4)

Si **P1001** sigue apareciendo con la URL directa (`db.xxx.supabase.co:5432`), es probable que Railway no pueda alcanzar esa conexión (p. ej. solo IPv6). Usa las URLs del **Connection Pooler** de Supabase, que suelen ser accesibles por IPv4.

---

## 1. Obtener las URLs en Supabase

1. Entra en **[Supabase Dashboard](https://supabase.com/dashboard)** y abre tu proyecto.
2. Arriba a la derecha, clic en **Connect** (o **Settings** → **Database**).
3. En **Connection string** verás varias pestañas. Necesitas:
   - **Session pooler** (puerto 5432) → para `DIRECT_URL` (migraciones).
   - **Transaction pooler** (puerto 6543) → para `DATABASE_URL` (app).

4. En **Session pooler**:
   - Elige **URI**.
   - Copia la cadena. Será algo como:
     ```text
     postgresql://postgres.ganrgbdkzxktuymxdmzf:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
     ```
   - Sustituye `[YOUR-PASSWORD]` por tu contraseña de base de datos (la misma que usas en el proyecto).
   - Añade al final: `?sslmode=require`
   - Esa URL completa es tu **DIRECT_URL**.

5. En **Transaction pooler**:
   - Copia la URI.
   - Sustituye la contraseña.
   - Añade al final: `?sslmode=require&pgbouncer=true`
   - Esa URL es tu **DATABASE_URL**.

---

## 2. Ponerlas en Railway

En **Railway** → tu servicio **prestamos** → **Variables**:

| Variable      | Valor |
|---------------|--------|
| **DIRECT_URL** | La URL de **Session pooler** (paso 4) con `?sslmode=require` al final. |
| **DATABASE_URL** | La URL de **Transaction pooler** (paso 5) con `?sslmode=require&pgbouncer=true` al final. |

Sin comillas, una sola línea por variable. Guarda y espera el redeploy (o haz **Redeploy** manual).

---

## 3. Ejemplo (sustituye región y contraseña)

Si tu **Session pooler** en Supabase es:
```text
postgresql://postgres.ganrgbdkzxktuymxdmzf:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

- **DIRECT_URL** en Railway:
  ```text
  postgresql://postgres.ganrgbdkzxktuymxdmzf:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
  ```

Si tu **Transaction pooler** es:
```text
postgresql://postgres.ganrgbdkzxktuymxdmzf:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

- **DATABASE_URL** en Railway:
  ```text
  postgresql://postgres.ganrgbdkzxktuymxdmzf:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
  ```

La región (`us-east-1`, `us-west-1`, `eu-west-1`, etc.) y el **project ref** (`ganrgbdkzxktuymxdmzf`) deben coincidir con lo que muestra Supabase en **Connect**.

---

## Resumen

- **Conexión directa** (`db.xxx.supabase.co:5432`) a veces no es alcanzable desde Railway (IPv6 / red).
- **Pooler** (`aws-0-REGION.pooler.supabase.com`) suele ser accesible (IPv4).
- Usa **Session pooler** para `DIRECT_URL` y **Transaction pooler** para `DATABASE_URL` con `pgbouncer=true`.
