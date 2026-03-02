@echo off
echo ========================================
echo  Inversiones Nazaret Reynoso
echo  Iniciando servidor...
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
    echo Instalando dependencias (esto puede tardar unos minutos)...
    call npm.cmd install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Error al instalar dependencias
        pause
        exit /b 1
    )
    echo.
)

REM Limpiar caché de Next.js para asegurar una ejecución limpia
echo Limpiando caché de Next.js...
if exist ".next" (
    echo Eliminando directorio .next...
    rmdir /s /q ".next" 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo Caché limpiada correctamente
    ) else (
        echo Advertencia: No se pudo limpiar completamente la caché
    )
) else (
    echo No hay caché para limpiar
)
echo.

REM Detener procesos en puerto 3000 si existen
echo Verificando puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo.
    echo Proceso encontrado en puerto 3000 (PID: %%a)
    echo Deteniendo proceso...
    taskkill /F /PID %%a >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Proceso detenido exitosamente
    ) else (
        echo Advertencia: No se pudo detener el proceso
    )
    timeout /t 2 /nobreak >nul
)
echo Puerto 3000 disponible
echo.

REM Iniciar el servidor
echo ========================================
echo  Iniciando servidor de desarrollo...
echo ========================================
echo.
echo El servidor se abrira en: http://localhost:3000
echo.
echo IMPORTANTE: No cierres esta ventana
echo Para detener el servidor, presiona Ctrl+C
echo.
echo ========================================
echo.

npm.cmd run dev

pause

