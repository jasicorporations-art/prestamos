@echo off
REM Ver el log del build de un despliegue en Vercel.
REM Uso: vercel-ver-log.bat ID
REM   ID = el codigo del enlace Inspect (ej: 2Bw8ZkA7o7Dw1fgcjKt3T8DRHWDs)
REM   Lo encuentras en: Inspect: https://vercel.com/.../ID

if "%~1"=="" (
    echo Uso: vercel-ver-log.bat ^<ID^>
    echo.
    echo Tras un build fallido, en la salida aparece:
    echo   Inspect: https://vercel.com/johns-projects-9d4c1d75/prestamosorigen/XXXXX
    echo Copia el ID (XXXXX) y ejecuta: vercel-ver-log.bat XXXXX
    echo.
    pause
    exit /b 0
)

echo Mostrando log del build para: %1
echo.
vercel inspect %1 --logs
echo.
pause
