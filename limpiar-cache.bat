@echo off
echo ========================================
echo  Limpiando Caché Completa
echo ========================================
echo.

cd /d "%~dp0"

REM Limpiar caché de Next.js
echo [1/3] Limpiando caché de Next.js (.next)...
if exist ".next" (
    rmdir /s /q ".next" 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Caché de Next.js eliminada
    ) else (
        echo ⚠️  No se pudo eliminar completamente .next
    )
) else (
    echo ℹ️  No hay caché .next para limpiar
)

REM Limpiar caché de npm (opcional, más agresivo)
echo.
echo [2/3] Limpiando caché de npm...
call npm.cmd cache clean --force >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Caché de npm limpiada
) else (
    echo ⚠️  No se pudo limpiar la caché de npm
)

REM Verificar node_modules
echo.
echo [3/3] Verificando dependencias...
if not exist "node_modules" (
    echo ⚠️  node_modules no existe. Ejecuta: npm.cmd install
) else (
    echo ✅ node_modules existe
)

echo.
echo ========================================
echo  Limpieza Completada
echo ========================================
echo.
echo Ahora puedes ejecutar:
echo   - iniciar-servidor.bat (para desarrollo)
echo   - compilar-y-ejecutar.bat (para producción)
echo.
pause



