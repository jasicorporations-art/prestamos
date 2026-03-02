# Desplegar en el proyecto Vercel "prestamosorigen"

**Proyecto en Vercel:** [prestamosorigen](https://vercel.com/johns-projects-9d4c1d75/prestamosorigen)

Este proyecto local (**prestamos.jasicorporations.com**) debe desplegarse en ese proyecto de Vercel para que los cambios (navbar, sidebar, etc.) se vean en la URL de producción.

## Por qué no se ven los cambios

Si en Vercel el proyecto se llama **prestamosorigen** pero este código estaba vinculado a otro proyecto (por ejemplo sisi-seven, cursor-nu-black, etc.), al hacer `vercel --prod` o al hacer push, se actualizaba **ese otro proyecto**, no prestamosorigen. Por eso los cambios no se reflejaban.

## Solución: vincular y desplegar en prestamosorigen

### Opción 1: Script automático (recomendado)

En PowerShell, en la carpeta del proyecto:

```powershell
.\desplegar-vercel-prestamosorigen.ps1
```

El script:
1. Quita la vinculación anterior (carpeta `.vercel`)
2. Vincula este código al proyecto **prestamosorigen** en Vercel
3. Despliega a producción

### Opción 2: Pasos manuales

1. **Quitar vinculación anterior**
   ```powershell
   Remove-Item -Recurse -Force .vercel -ErrorAction SilentlyContinue
   ```

2. **Vincular al proyecto prestamosorigen**
   ```powershell
   vercel link --project prestamosorigen
   ```
   - **Select scope:** elige el equipo donde está prestamosorigen (el de la URL: [johns-projects-9d4c1d75/prestamosorigen](https://vercel.com/johns-projects-9d4c1d75/prestamosorigen)).
   - **Link to existing project?** → Yes.
   - **What’s the name of your existing project?** → `prestamosorigen` (o selecciónalo de la lista).

3. **Desplegar a producción**
   ```powershell
   vercel --prod
   ```

### Si usas Git y el repo está conectado a Vercel

1. Entra al proyecto: [vercel.com/johns-projects-9d4c1d75/prestamosorigen](https://vercel.com/johns-projects-9d4c1d75/prestamosorigen).
2. Ve a **Settings** → **Git**.
3. Comprueba que el repositorio conectado sea el que usas para este código (el de esta carpeta).
4. Si estaba conectado a otro repo (o a otra rama), cambia la conexión al repo correcto.
5. Haz **push** a la rama que Vercel tiene configurada (normalmente `main`); Vercel desplegará automáticamente.

Así, cada vez que hagas push, se desplegará en **prestamosorigen** y verás los cambios ahí.

## Verificar el nombre exacto del proyecto

En [vercel.com](https://vercel.com) → tu equipo → **Projects**, revisa que el nombre sea exactamente **prestamosorigen**. Si es distinto (por ejemplo con guiones), usa ese nombre en:

```powershell
vercel link --project NOMBRE_EXACTO
```

## Resumen

| Dónde está el código | Dónde debe desplegarse |
|----------------------|-------------------------|
| Esta carpeta (prestamos.jasicorporations.com) | [prestamosorigen](https://vercel.com/johns-projects-9d4c1d75/prestamosorigen) |

Después de vincular con `vercel link --project prestamosorigen` y desplegar con `vercel --prod` (o hacer push si Git está conectado), la URL de **prestamosorigen** mostrará este código con la nueva navbar y sidebar.
