@echo off
echo Limpiando cache...
if exist .next rmdir /s /q .next
echo Compilando proyecto...
call npm run build 2>&1 | tee build-output.txt
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo COMPILACION EXITOSA
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERRORES ENCONTRADOS
    echo ========================================
    type build-output.txt
)
pause



