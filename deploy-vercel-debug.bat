@echo off
echo Compilando...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build fallo. Corrige los errores antes de desplegar.
    pause
    exit /b 1
)
echo.
echo Desplegando con modo debug (veras el error real si falla)...
echo.
vercel --prod --debug
echo.
pause
