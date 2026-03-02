@echo off
cd /d "%~dp0"
echo ========================================
echo DESPLIEGUE A VERCEL - PROYECTO PRESTAMOSORIGEN
echo https://vercel.com/johns-projects-9d4c1d75/prestamosorigen
echo ========================================
echo.

REM Paso 1: Desvincular del proyecto actual
echo Paso 1: Desvinculando del proyecto actual...
if exist .vercel (
    rmdir /s /q .vercel
    echo   [OK] Carpeta .vercel eliminada
) else (
    echo   [OK] No habia vinculo previo
)
echo.

REM Paso 2: Limpiar cache
echo Paso 2: Limpiando cache...
if exist .next rmdir /s /q .next
echo   [OK] Cache limpiada
echo.

REM Paso 3: Verificar Vercel CLI
echo Paso 3: Verificando Vercel CLI...
call vercel --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Vercel CLI no esta instalado. Ejecuta: npm install -g vercel
    pause
    exit /b 1
)
echo   [OK] Vercel CLI encontrado
echo.

REM Paso 4: Compilar
echo Paso 4: Compilando proyecto...
call npm.cmd run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR en la compilacion
    pause
    exit /b 1
)
echo   [OK] Compilacion exitosa
echo.

REM Paso 5: Vincular al proyecto prestamosorigen
echo Paso 5: Vinculando al proyecto prestamosorigen...
call vercel link --yes --project prestamosorigen
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Si el proyecto prestamosorigen no existe, crealo primero en vercel.com
    echo Intentando vincular de forma interactiva...
    call vercel link --project prestamosorigen
    if %ERRORLEVEL% NEQ 0 (
        pause
        exit /b 1
    )
)
echo.

REM Paso 6: Desplegar a produccion
echo Paso 6: Desplegando a produccion (prestamosorigen)...
call vercel --prod --yes --debug
if %ERRORLEVEL% NEQ 0 (
    call vercel --prod --debug
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   HUBO UN ERROR EN EL DEPLOY
    echo ========================================
    echo Arriba en la salida busca la linea "Inspect: https://vercel.com/.../XXXXX"
    echo Copia el ID final y ejecuta: vercel inspect ID --logs
    echo O abre el enlace Inspect en el navegador para ver el error exacto.
    echo.
    echo Presiona una tecla para cerrar...
    pause >nul
    exit /b 1
)
echo.
echo ========================================
echo DESPLIEGUE COMPLETADO
echo ========================================
echo.
echo Desplegado en: prestamosorigen (revisa la URL en Vercel)
echo.
echo Presiona una tecla para cerrar esta ventana...
pause >nul
