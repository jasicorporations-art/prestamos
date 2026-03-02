# 📤 Subir la Corrección de pagosService.delete

He corregido el error en `lib/services/syncService.ts`:
- `pagosService.delete` solo acepta 1 argumento (el id)
- Eliminado el segundo argumento `data.venta_id` que no es necesario

## Comandos en Git Bash

```bash
cd /c/Users/Owner/.cursor
git add lib/services/syncService.ts
git commit -m "Corregir error: pagosService.delete solo acepta 1 argumento"
git push
```

Después del push, Vercel hará un nuevo deployment. ¡Esta vez debería compilar exitosamente! 🎉









