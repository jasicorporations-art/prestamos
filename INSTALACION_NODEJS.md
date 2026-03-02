# 🔧 Guía de Instalación de Node.js

## Problema Detectado

Node.js y npm no están instalados en tu sistema, o no están disponibles en el PATH.

## Solución: Instalar Node.js

### Opción 1: Instalador Oficial (Recomendado)

1. **Descargar Node.js:**
   - Ir a: https://nodejs.org/
   - Descargar la versión **LTS** (Long Term Support) - Recomendada para la mayoría de usuarios
   - El instalador incluye tanto Node.js como npm

2. **Instalar:**
   - Ejecutar el instalador descargado
   - Seguir el asistente de instalación (usar configuración por defecto)
   - ✅ Asegurarse de marcar la opción "Add to PATH" si aparece

3. **Verificar la instalación:**
   - Abrir una **nueva** ventana de PowerShell o CMD
   - Ejecutar:
     ```powershell
     node --version
     npm --version
     ```
   - Deberías ver números de versión (ej: v18.17.0 y 9.6.7)

### Opción 2: Usando Chocolatey (Si ya lo tienes instalado)

```powershell
choco install nodejs-lts
```

### Opción 3: Usando Winget (Windows 10/11)

```powershell
winget install OpenJS.NodeJS.LTS
```

## Después de Instalar Node.js

1. **Cerrar y reabrir** PowerShell o CMD (importante para que reconozca Node.js)

2. **Navegar al directorio del proyecto:**
   ```powershell
   cd C:\Users\Owner\.cursor
   ```

3. **Instalar las dependencias del proyecto:**
   ```powershell
   npm install
   ```

4. **Verificar que todo funciona:**
   ```powershell
   npm run dev
   ```

## Requisitos Mínimos

- **Node.js:** Versión 18 o superior
- **npm:** Viene incluido con Node.js (versión 9 o superior)

## Solución de Problemas

### Si después de instalar Node.js aún no funciona:

1. **Verificar que Node.js está en el PATH:**
   - Buscar "Variables de entorno" en Windows
   - Verificar que `C:\Program Files\nodejs\` está en la variable PATH
   - Si no está, agregarlo manualmente

2. **Reiniciar la computadora** después de instalar Node.js

3. **Usar una nueva ventana de terminal** (no reutilizar la anterior)

### Si tienes problemas con permisos:

- Ejecutar PowerShell como Administrador
- O instalar Node.js para el usuario actual (no requiere admin)

## Verificación Final

Una vez instalado Node.js, ejecuta estos comandos para verificar:

```powershell
node --version    # Debe mostrar: v18.x.x o superior
npm --version     # Debe mostrar: 9.x.x o superior
```

## Siguiente Paso

Después de instalar Node.js exitosamente, continúa con la guía en `INICIO_RAPIDO.md`

---

**Nota:** Si ya tienes Node.js instalado pero no se reconoce, puede ser un problema de PATH. En ese caso, reinstala Node.js o agrega manualmente la ruta a las variables de entorno.

