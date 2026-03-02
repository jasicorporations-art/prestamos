# 📤 Subir globals.css y Actualizar layout.tsx

He creado el archivo `app/globals.css` con las directivas de Tailwind y lo he importado en `app/layout.tsx`.

**Problema resuelto:**
- La página aparecía en blanco porque faltaban los estilos de Tailwind CSS
- Ahora los estilos se cargarán correctamente

## Comandos en Git Bash

```bash
cd /c/Users/Owner/.cursor
git add app/globals.css app/layout.tsx app/page.tsx
git commit -m "Agregar globals.css y actualizar layout para que los estilos funcionen"
git push
```

Después del push, Vercel hará un nuevo deployment. La página debería mostrar correctamente los estilos ahora. 🎉









