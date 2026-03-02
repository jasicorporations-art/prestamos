# Ver el error real cuando falla el build en Vercel

Cuando ves `Error: Command "npm run build" exited with 1`, el motivo concreto aparece en los **logs de Vercel**, no en tu terminal.

## 0. IMPORTANTE: Variables para Production

El build de **producción** en Vercel usa **solo** las variables del entorno **Production**. Si configuraste variables solo en "Development", el build de Production **no las ve**.

- Vercel → **prestamosorigen** → **Settings** → **Environment Variables**.
- En cada variable que uses, marca el checkbox **Production** (además de Preview/Development si quieras).
- Mínimo para que el build no falle por env: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con **Production** activado.

## 1. Abrir el log del despliegue

Cada vez que despliegas, Vercel muestra una línea como:

```
🔍  Inspect: https://vercel.com/johns-projects-9d4c1d75/prestamosorigen/XXXXX
```

**Ver el log en la terminal:** Copia el ID (XXXXX) y ejecuta: `vercel inspect XXXXX --logs` (o `vercel-ver-log.bat XXXXX`). Ahí sale el error exacto del build.

- O abre esa URL **Inspect** en el navegador.
- Entra en la pestaña **“Building”** (o “Build Logs”).
- Baja hasta el final del log: el mensaje en rojo o la última línea suele ser el error (por ejemplo tipo de TypeScript, módulo no encontrado, variable de entorno, etc.).

Copia ese mensaje para poder corregirlo.

## 2. Revisar variables de entorno en Producción

El build en Vercel usa las variables de **Production**.

- Vercel → tu proyecto **prestamosorigen** → **Settings** → **Environment Variables**.
- Asegúrate de que están definidas para **Production** (no solo Preview/Development).
- Para que el build no falle por variables, suele bastar con tener en Production:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

El resto (Stripe, Evolution, Resend, etc.) son sobre todo para runtime.

## 3. Versión de Node

- **Settings** → **General** → **Node.js Version**.
- Prueba con **18.x** (o la que tengas en `.nvmrc`, ahora 18).

## 4. Resumen

1. Abre el enlace **Inspect** del despliegue fallido.
2. Mira el log de **Building** y localiza el error.
3. Revisa variables de entorno en **Production** y la versión de Node.

Cuando tengas el mensaje de error exacto del log, se puede indicar el cambio concreto en el código o en la configuración.
