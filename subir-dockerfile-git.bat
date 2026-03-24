@echo off
cd /d "%~dp0"
title Subir Dockerfile a Git (para que Railway lo use)

echo ========================================
echo   SUBIR DOCKERFILE AL REPOSITORIO
echo ========================================
echo.
echo Railway construye desde el repo (GitHub). Si el Dockerfile
echo no esta subido, Railway usa una version vieja sin variables.
echo.
echo Este script hace: git add Dockerfile, commit, push
echo ========================================
echo.

git add Dockerfile
git status
echo.
set /p CONFIRMAR="Escribe S y Enter para hacer commit y push (o Enter para cancelar): "
if /i not "%CONFIRMAR%"=="S" (
    echo Cancelado.
    pause
    exit /b 0
)

git commit -m "Dockerfile: variables Supabase para build en Railway"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo No hay cambios o fallo el commit. Revisa arriba.
    pause
    exit /b 1
)

git push
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Fallo el push. ¿Tienes remoto configurado? git remote -v
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Listo. Railway deberia detectar el push y volver a construir.
echo   Revisa en Railway -^> prestamo -^> Deployments
echo ========================================
pause
