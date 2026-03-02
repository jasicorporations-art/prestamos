# 📤 Subir las Propiedades Faltantes de Venta

He agregado las propiedades faltantes a la interfaz `Venta`:
- `tipo_plazo?: 'mensual' | 'quincenal' | 'semanal'`
- `dia_pago_semanal?: number`
- `fecha_inicio_quincenal?: string`

## Comandos en Git Bash

```bash
cd /c/Users/Owner/.cursor
git add lib/services/ventas.ts
git commit -m "Agregar propiedades tipo_plazo, dia_pago_semanal y fecha_inicio_quincenal a Venta"
git push
```

Después del push, Vercel hará un nuevo deployment. ¡Esta vez debería compilar exitosamente! 🎉









