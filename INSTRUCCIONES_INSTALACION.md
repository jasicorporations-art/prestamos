# 📋 Instrucciones de Instalación - Paso a Paso

## ✅ Estado Actual

- ✅ Node.js está instalado (v24.12.0)
- ✅ npm está disponible (v11.6.2)
- ⚠️ Node.js no está en el PATH del sistema

## 🚀 Instalación Rápida (Usando el Script)

### Opción 1: Ejecutar el Script Automático

1. Abre PowerShell en el directorio del proyecto
2. Ejecuta:
   ```powershell
   .\instalar.ps1
   ```

Si aparece un error de política de ejecución, ejecuta primero:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Opción 2: Instalación Manual

1. **Agregar Node.js al PATH temporalmente:**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   ```

2. **Instalar dependencias:**
   ```powershell
   npm.cmd install
   ```

   ⏱️ **Esto tomará varios minutos** - es normal, no canceles el proceso.

3. **Esperar a que termine:**
   - Verás muchos mensajes de descarga
   - Al final debería decir "added XXX packages"

## 🔧 Solución Permanente del PATH (Opcional pero Recomendado)

Para no tener que agregar Node.js al PATH cada vez:

1. Presiona `Win + R`
2. Escribe: `sysdm.cpl` y presiona Enter
3. Ve a "Opciones avanzadas" > "Variables de entorno"
4. En "Variables del sistema", selecciona "Path" > "Editar"
5. Haz clic en "Nuevo" y agrega: `C:\Program Files\nodejs`
6. Haz clic en "Aceptar" en todas las ventanas
7. **Cierra y reabre PowerShell**

Después de esto, podrás usar `npm` directamente sin `.cmd`

## ✅ Verificación

Después de instalar, verifica que todo funciona:

```powershell
# Verificar que node_modules existe
Test-Path node_modules

# Debe mostrar: True
```

## 🎯 Siguiente Paso

Una vez instaladas las dependencias:

1. **Configurar Supabase** (ver `INICIO_RAPIDO.md`)
2. **Crear archivo `.env.local`** con tus credenciales
3. **Ejecutar la aplicación:**
   ```powershell
   npm.cmd run dev
   ```

## ⚠️ Notas Importantes

- La instalación puede tomar **5-10 minutos** dependiendo de tu conexión
- No canceles el proceso aunque veas muchos mensajes
- Si hay errores, verifica tu conexión a internet
- Usa `npm.cmd` en lugar de `npm` si no agregaste al PATH permanentemente

## 🆘 Si Tienes Problemas

1. Verifica tu conexión a internet
2. Intenta eliminar `node_modules` y `package-lock.json` y reinstalar:
   ```powershell
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   Remove-Item package-lock.json -ErrorAction SilentlyContinue
   npm.cmd install
   ```
3. Revisa `SOLUCION_PROBLEMAS.md` para más ayuda



