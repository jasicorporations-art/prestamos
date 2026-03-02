# Desplegar en proyecto SISI (sin afectar prestamos.jasi)

## Objetivo
Desplegar este código en el proyecto **sisi** / **sisi-seven** de Vercel, sin modificar tu proyecto actual **prestamos.jasi**.

## Opción 1: Script automático (PowerShell)

```powershell
.\desplegar-vercel-sisi.ps1
```

**Si el proyecto se llama diferente** (ej: `sisi` en vez de `sisi-seven`), edita el archivo `desplegar-vercel-sisi.ps1` y cambia `sisi-seven` por el nombre correcto en las líneas donde aparece.

## Opción 2: Pasos manuales

1. **Desvincular del proyecto actual**
   ```powershell
   Remove-Item -Recurse -Force .vercel -ErrorAction SilentlyContinue
   ```

2. **Compilar**
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run build
   ```

3. **Vincular al proyecto SISI**
   ```powershell
   vercel link --project sisi-seven
   ```
   *(Si te pregunta, selecciona el proyecto "sisi" o "sisi-seven" según cómo aparezca en tu cuenta)*

4. **Desplegar a producción**
   ```powershell
   vercel --prod
   ```

## Verificar el nombre del proyecto

En [vercel.com](https://vercel.com) → tu equipo → proyectos, revisa el nombre exacto del proyecto SISI (puede ser `sisi`, `sisi-seven`, etc.) y úsalo en `vercel link --project NOMBRE`.

## URLs

- **Proyecto actual (no se toca):** prestamos.jasi
- **Proyecto destino:** sisi-seven.vercel.app o sisi-a0fi4m2kj-johns-projects-9d4c1d75.vercel.app
