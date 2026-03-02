@echo off
echo ========================================
echo  Diagnostico del Sistema
echo ========================================
echo.

cd /d "%~dp0"

REM Verificar Node.js
echo [1/5] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set "PATH=%PATH%;C:\Program Files\nodejs"
    where node >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Node.js NO encontrado
        echo    Por favor instala Node.js desde https://nodejs.org/
        goto :end
    )
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js encontrado: %NODE_VERSION%
echo.

REM Verificar npm
echo [2/5] Verificando npm...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set "PATH=%PATH%;C:\Program Files\nodejs"
    where npm.cmd >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ npm NO encontrado
        goto :end
    )
)
for /f "tokens=*" %%i in ('npm.cmd --version') do set NPM_VERSION=%%i
echo ✅ npm encontrado: %NPM_VERSION%
echo.

REM Verificar node_modules
echo [3/5] Verificando dependencias...
if exist "node_modules\.bin\next.cmd" (
    echo ✅ Dependencias instaladas correctamente
) else if exist "node_modules" (
    echo ⚠️  Carpeta node_modules existe pero puede estar incompleta
    echo    Verificando si Next.js esta instalado...
    if not exist "node_modules\.bin\next.cmd" (
        echo ❌ Next.js no encontrado, instalando dependencias...
        echo    Esto puede tardar varios minutos...
        call npm.cmd install
        if %ERRORLEVEL% NEQ 0 (
            echo ❌ Error al instalar dependencias
            goto :end
        )
        echo ✅ Dependencias instaladas
    )
) else (
    echo ❌ Dependencias NO instaladas
    echo    Ejecutando: npm.cmd install
    echo    Esto puede tardar varios minutos...
    echo    Por favor espera, NO cierres esta ventana...
    call npm.cmd install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Error al instalar dependencias
        goto :end
    )
    echo ✅ Dependencias instaladas
)
echo.

REM Verificar .env.local
echo [4/5] Verificando configuracion...
if exist ".env.local" (
    echo ✅ Archivo .env.local existe
) else (
    echo ⚠️  Archivo .env.local NO existe
    echo    La aplicacion puede no conectarse a Supabase
)
echo.

REM Verificar puerto 3000
echo [5/5] Verificando puerto 3000...
netstat -ano | findstr :3000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Puerto 3000 esta en uso
    echo    Puede haber otro servidor corriendo
) else (
    echo ✅ Puerto 3000 disponible
)
echo.

echo ========================================
echo  Intentando iniciar el servidor...
echo ========================================
echo.
echo El servidor se iniciara en: http://localhost:3000
echo.
echo Si ves errores abajo, copialos y compartelos
echo.
echo ========================================
echo.

REM Iniciar el servidor
call npm.cmd run dev

:end
echo.
echo ========================================
pause

