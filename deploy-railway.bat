@echo off
cd /d "%~dp0"
setlocal EnableDelayedExpansion
set LOGFILE=railway-deploy-log.txt
set TIMESTAMP=%date:~-4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo ========================================
echo   DESPLIEGUE A RAILWAY
echo ========================================
echo.
echo Salida guardada en: %LOGFILE%
echo Para compartir un error: abre ese archivo, copia el mensaje y pegalo donde te pidan ayuda.
echo.

REM ----- Verificar Railway CLI -----
echo [1/4] Verificando Railway CLI...
where railway >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   ERROR: Railway CLI no esta instalado.
    echo   Instalalo con: npm install -g @railway/cli
    echo   O desde https://docs.railway.com/guides/cli
    echo.
    echo   Despues ejecuta: railway login
    echo.
    goto :error
)
echo   [OK] Railway CLI encontrado.
echo.

REM ----- Compilar localmente (opcional, Railway tambien hace build) -----
echo [2/4] Compilando proyecto (prisma generate + next build)...
call npm.cmd run build >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   AVISO: Build local fallo. Railway intentara compilar en la nube.
    echo   Si el deploy falla, revisa los Build Logs en Railway.
) else (
    echo   [OK] Build local exitoso.
)
echo.

REM ----- Desplegar a Railway -----
echo [3/4] Subiendo y desplegando (railway up)...
echo       Toda la salida se guarda en: %LOGFILE%
echo.
if exist "%LOGFILE%" del "%LOGFILE%"
echo Deploy Railway - %date% %time% > "%LOGFILE%"
echo. >> "%LOGFILE%"
call railway up >> "%LOGFILE%" 2>&1
set DEPLOY_EXIT=%ERRORLEVEL%
echo.
echo [4/4] Log completo (para copiar/pegar si hay error):
echo ----------------------------------------
type "%LOGFILE%"
echo ----------------------------------------
echo.

if %DEPLOY_EXIT% NEQ 0 (
    goto :error
)

echo ========================================
echo   DEPLOY COMPLETADO
echo ========================================
echo   Revisa tu app en el dashboard de Railway.
echo   Log completo: %LOGFILE%
echo ========================================
echo.
goto :end

:error
echo.
echo ========================================
echo   HUBO UN ERROR
echo ========================================
echo   Para que te ayuden con el error:
echo   1. Abre el archivo: %LOGFILE%
echo   2. Copia las lineas donde aparece el error (sobre todo el mensaje en rojo o "Error:")
echo   3. Pega ese texto donde te pidan el error
echo.
echo   Tambien puedes abrir Railway Dashboard -^> Deployments -^> ultimo deploy -^>
echo   Build Logs o Deploy Logs y copiar el error de ahi.
echo ========================================
echo.
pause
exit /b 1

:end
echo.
echo Presiona una tecla para cerrar esta ventana...
pause >nul
endlocal
