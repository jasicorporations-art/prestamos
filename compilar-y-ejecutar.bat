@echo off
echo ========================================
echo  Compilando y Ejecutando Aplicacion
echo ========================================
echo.

cd /d "%~dp0"

REM Agregar Node.js al PATH
set "PATH=%PATH%;C:\Program Files\nodejs"

REM Verificar que Node.js existe
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no encontrado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar que node_modules existe
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm.cmd install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Error al instalar dependencias
        pause
        exit /b 1
    )
    echo.
)

echo Compilando aplicacion para produccion...
call npm.cmd run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Error al compilar
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Compilacion exitosa!
echo ========================================
echo.
echo Iniciando servidor de produccion...
echo El servidor se abrira en: http://localhost:3000
echo.
echo Para detener el servidor, presiona Ctrl+C
echo.
echo ========================================
echo.

call npm.cmd start

pause

