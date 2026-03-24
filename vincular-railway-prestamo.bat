@echo off
cd /d "%~dp0"
title Vincular a Railway - proyecto prestamo

echo ========================================
echo   VINCULAR ESTE REPO AL PROYECTO RAILWAY "prestamo"
echo ========================================
echo.
echo Si borraste otros proyectos, el enlace quedo roto.
echo Este script abre el menu de Railway para que elijas de nuevo.
echo.
echo 1. Ejecuta: railway link
echo 2. En el menu, elige el PROYECTO "prestamo"
echo 3. Luego elige el SERVICIO (el que despliega esta app)
echo 4. Listo. Despues ejecuta Ejecutar-Deploy-Railway.bat
echo.
echo ========================================
echo.

railway link

echo.
echo Si viste el menu y elegiste "prestamo", ya estas vinculado.
echo Presiona una tecla para cerrar...
pause >nul
