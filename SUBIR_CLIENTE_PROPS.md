# 📤 Subir las Propiedades Faltantes del Cliente en Venta

He agregado las propiedades faltantes al tipo `cliente` en la interfaz `Venta`:
- `direccion?: string`
- `celular?: string`
- `email?: string`

También actualizado las consultas SQL para incluir estas propiedades.

## Comandos en Git Bash

```bash
cd /c/Users/Owner/.cursor
git add lib/services/ventas.ts
git commit -m "Agregar propiedades direccion, celular, email al tipo cliente en Venta"
git push
```

Después del push, Vercel hará un nuevo deployment. ¡Esta vez debería compilar exitosamente! 🎉









