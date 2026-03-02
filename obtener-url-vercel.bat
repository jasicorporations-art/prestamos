@echo off
echo ========================================
echo OBTENER URL DEL PROYECTO EN VERCEL
echo ========================================
echo.

echo Verificando que Vercel CLI este instalado...
call vercel --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: Vercel CLI no esta instalado
    echo ========================================
    echo.
    echo Instala Vercel CLI con:
    echo npm install -g vercel
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Listando proyectos en Vercel...
echo ========================================
echo.

call vercel ls

echo.
echo ========================================
echo INFORMACION ADICIONAL
echo ========================================
echo.
echo Si quieres ver mas detalles de un proyecto especifico:
echo 1. Ve a: https://vercel.com/dashboard
echo 2. Haz clic en el proyecto que quieres
echo 3. Veras la URL en la parte superior
echo.
echo O ejecuta: vercel inspect
echo.
pause
