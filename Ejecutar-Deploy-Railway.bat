@echo off
title Deploy a Railway - prestamo
cd /d "%~dp0"

echo ========================================
echo   INICIANDO DEPLOY (no cierres esta ventana)
echo ========================================
echo.

call deploy-railway.bat

echo.
echo ========================================
echo   Esta ventana permanece abierta.
echo   Cierra cuando quieras o presiona una tecla.
echo ========================================
pause
