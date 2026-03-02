# 🔧 Solución Permanente para el Problema de PATH

## Problema Identificado

Node.js está instalado en `C:\Program Files\nodejs\` pero no está en el PATH del sistema, por lo que PowerShell no lo reconoce automáticamente.

## ✅ Solución Rápida (Temporal)

Para esta sesión de PowerShell, ejecuta:

```powershell
$env:PATH += ";C:\Program Files\nodejs"
```

Luego usa `npm.cmd` en lugar de `npm`:

```powershell
npm.cmd install
```

## 🔧 Solución Permanente (Recomendada)

### Opción 1: Agregar al PATH del Sistema (Recomendado)

1. **Abrir Variables de Entorno:**
   - Presiona `Win + R`
   - Escribe: `sysdm.cpl` y presiona Enter
   - Ve a la pestaña "Opciones avanzadas"
   - Haz clic en "Variables de entorno"

2. **Editar PATH:**
   - En "Variables del sistema", busca "Path"
   - Selecciónalo y haz clic en "Editar"
   - Haz clic en "Nuevo"
   - Agrega: `C:\Program Files\nodejs`
   - Haz clic en "Aceptar" en todas las ventanas

3. **Reiniciar PowerShell:**
   - Cierra todas las ventanas de PowerShell
   - Abre una nueva ventana
   - Verifica con: `node --version`

### Opción 2: Usar npm.cmd siempre

Siempre usa `npm.cmd` en lugar de `npm`:

```powershell
npm.cmd install
npm.cmd run dev
```

### Opción 3: Cambiar Política de Ejecución (Solo si es necesario)

Si quieres usar `npm` directamente, puedes cambiar la política de ejecución:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Nota:** Esto requiere permisos de administrador y puede tener implicaciones de seguridad.

## 🚀 Instalación de Dependencias

Una vez solucionado el PATH, instala las dependencias:

```powershell
# Opción 1: Si agregaste al PATH y reiniciaste PowerShell
npm install

# Opción 2: Si usas npm.cmd
npm.cmd install

# Opción 3: Ruta completa
& "C:\Program Files\nodejs\npm.cmd" install
```

## ✅ Verificación

Después de agregar al PATH y reiniciar PowerShell:

```powershell
node --version    # Debe mostrar: v24.12.0 o similar
npm --version     # Debe mostrar: 11.6.2 o similar
```

## 📝 Nota Importante

- **Reiniciar PowerShell es esencial** después de cambiar el PATH
- Si no reinicias, los cambios no se aplicarán
- Puedes verificar el PATH actual con: `$env:PATH`



