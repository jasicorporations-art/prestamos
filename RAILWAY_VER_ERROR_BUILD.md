# Cómo ver el error real cuando falla el build en Railway

Cuando el build falla, Railway muestra al final algo como:

```
RUN npm run build
ERROR: failed to build: exit code: 1
```

**El mensaje que importa está más arriba.** Para verlo:

1. Entra a **Railway** → proyecto **prestamo** → **Deployments**.
2. Abre el **último deploy** (el que falló).
3. Abre **Build Logs** (o **View Logs**).
4. **Sube** (scroll hacia arriba) hasta **antes** de la línea `RUN npm run build`.
5. Busca líneas que digan:
   - `Error:`
   - `Failed to collect page data`
   - `NEXT_PUBLIC_SUPABASE`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. **Copia** esas 15–20 líneas y úsalas para depurar o pedir ayuda.

Ese es el error real de Next.js; el final del log solo indica que el comando falló.
