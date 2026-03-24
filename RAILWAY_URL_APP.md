# URL de tu proyecto en Railway – qué variable usar

## URL de la app Prestamos (la que abre el usuario)

La URL **https://prestamos-production-9fee.up.railway.app** es la de **tu app**. En el código eso se usa con la variable:

**NEXT_PUBLIC_APP_URL**

- **Nombre en Railway:** `NEXT_PUBLIC_APP_URL`
- **Valor:** `https://prestamos-production-9fee.up.railway.app` (sin barra final)
- **Para qué sirve:** Redirects de Stripe, enlaces en emails, callbacks, “origen” de la app. Si falta, los enlaces pueden apuntar a localhost o a otra URL.

Si esa variable desapareció en Railway, **vuelve a crearla** con el nombre exacto `NEXT_PUBLIC_APP_URL` y el valor de la URL de tu proyecto (la que te da Railway para prestamos).

---

## SERVER_URL (Evolution API)

En este proyecto **SERVER_URL** no es la URL de prestamos. Se usa en `lib/evolution-railway.ts` como **URL base de Evolution API** (el otro servicio de WhatsApp en Railway).

- **Nombre en Railway:** `SERVER_URL`
- **Valor correcto:** la URL del servicio de **Evolution API** en Railway (ej. `https://evolution-api-production-830d.up.railway.app`), **no** la URL de prestamos.

Si pones en SERVER_URL la URL de prestamos, las llamadas a Evolution API irían a tu app en vez de al API de WhatsApp y no funcionarían.

---

## Resumen

| Variable                | Valor correcto en Railway (prestamos) |
|------------------------|----------------------------------------|
| **NEXT_PUBLIC_APP_URL** | `https://prestamos-production-9fee.up.railway.app` |
| **SERVER_URL**         | URL de Evolution API (solo si usas Evolution), no la URL de prestamos |

Si “donde estaba la URL de mi proyecto” era la de prestamos, esa va en **NEXT_PUBLIC_APP_URL**. Si faltaba o desapareció, añádela de nuevo en Railway → Variables.
