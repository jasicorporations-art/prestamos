# 🔧 Solución: Git no se reconoce en PowerShell

## Opción 1: Reiniciar PowerShell (Más Fácil)

1. **Cierra completamente** PowerShell
2. Abre PowerShell **como Administrador** (clic derecho → "Ejecutar como administrador")
3. Prueba de nuevo: `git --version`

## Opción 2: Agregar Git al PATH Manualmente

Si Git está instalado pero no funciona:

1. **Busca dónde está Git instalado**:
   - Busca "Git" en el menú de inicio de Windows
   - Haz clic derecho en "Git Bash" → "Abrir ubicación del archivo"
   - Copia la ruta (normalmente es: `C:\Program Files\Git\bin` o `C:\Program Files (x86)\Git\bin`)

2. **Agregar al PATH**:
   - Presiona `Win + R`
   - Escribe: `sysdm.cpl` y presiona Enter
   - Ve a la pestaña **"Opciones avanzadas"**
   - Haz clic en **"Variables de entorno"**
   - En "Variables del sistema", busca **"Path"**
   - Haz clic en **"Editar"**
   - Haz clic en **"Nuevo"**
   - Pega la ruta de Git (ej: `C:\Program Files\Git\bin`)
   - Haz clic en **"Aceptar"** en todas las ventanas
   - **Cierra y vuelve a abrir PowerShell**

## Opción 3: Usar Git Bash (Alternativa)

Si Git está instalado, puedes usar Git Bash en lugar de PowerShell:

1. Busca "Git Bash" en el menú de inicio
2. Ábrelo
3. Navega a tu proyecto:
   ```bash
   cd /c/Users/Owner/.cursor
   ```
4. Ejecuta los comandos Git normalmente

## Opción 4: Reinstalar Git (Si nada funciona)

1. **Desinstala Git**:
   - Ve a Configuración → Aplicaciones
   - Busca "Git" y desinstálalo

2. **Vuelve a instalar Git**:
   - Descarga desde: https://git-scm.com/download/win
   - Durante la instalación, **asegúrate de marcar**:
     - ✅ "Git from the command line and also from 3rd-party software"
     - ✅ "Use bundled OpenSSH"
   - Completa la instalación

3. **Cierra y vuelve a abrir PowerShell**

## Verificar que Funciona

Después de cualquier opción, prueba:

```powershell
git --version
```

Deberías ver algo como: `git version 2.43.0` (o similar)

## Si Aún No Funciona

Prueba abrir **Git Bash** directamente (está en el menú de inicio después de instalar Git) y ejecuta los comandos ahí. Git Bash funciona igual que PowerShell pero con Git incluido.









