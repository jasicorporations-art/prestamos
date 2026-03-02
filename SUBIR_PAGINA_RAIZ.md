# 📤 Subir la Página Raíz (app/page.tsx)

He creado el archivo `app/page.tsx` que faltaba. Esta es la página que se muestra en la ruta raíz `/`.

La página:
- Verifica si el usuario está autenticado
- Si está autenticado, redirige a `/dashboard`
- Si no está autenticado, redirige a `/login`
- Muestra un loading mientras verifica

## Comandos en Git Bash

```bash
cd /c/Users/Owner/.cursor
git add app/page.tsx
git commit -m "Agregar página raíz que redirige a dashboard o login"
git push
```

Después del push, Vercel hará un nuevo deployment. El error 404 debería desaparecer. 🎉









