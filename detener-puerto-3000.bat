@echo off
echo ========================================
echo  Deteniendo procesos en puerto 3000
echo ========================================
echo.

REM Buscar procesos que usan el puerto 3000
set PROCESOS_DETENIDOS=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo Proceso encontrado en puerto 3000: PID %%a
    taskkill /F /PID %%a
    if %ERRORLEVEL% EQU 0 (
        echo Proceso %%a detenido exitosamente
        set /a PROCESOS_DETENIDOS+=1
    ) else (
        echo No se pudo detener el proceso %%a
    )
    timeout /t 1 /nobreak >nul
)

REM Verificar nuevamente
timeout /t 2 /nobreak >nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo Advertencia: Aun hay un proceso en el puerto 3000 (PID: %%a)
    echo Intentando detener nuevamente...
    taskkill /F /PID %%a
    timeout /t 2 /nobreak >nul
)

REM Verificación final
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo.
    echo ERROR: No se pudo liberar el puerto 3000
    echo El proceso PID %%a aun esta usando el puerto
    echo.
    echo Intenta detenerlo manualmente:
    echo   taskkill /F /PID %%a
    echo.
    pause
    exit /b 1
)

echo.
if %PROCESOS_DETENIDOS% EQU 0 (
    echo No se encontraron procesos en el puerto 3000
) else (
    echo Se detuvieron %PROCESOS_DETENIDOS% proceso(s)
)
echo Puerto 3000 esta libre
echo.
echo ========================================
echo  Proceso completado
echo ========================================
echo.
pause

