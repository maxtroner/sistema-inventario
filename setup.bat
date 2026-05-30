@echo off
title Sistema de Inventario - Instalador
cd /d "%~dp0"

echo ============================================
echo   Sistema de Inventario - Instalador
echo ============================================
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0' -Wait"
    exit /b
)

set "INSTALL_DIR=%ProgramFiles%\Sistema Inventario"
set "APP_DIR=%~dp0dist\win-unpacked"

if not exist "%APP_DIR%\Sistema Inventario.exe" (
    echo ERROR: No se encontro la aplicacion compilada.
    echo Ejecuta primero: npm run build
    echo O descarga la version portable completa.
    pause
    exit /b 1
)

echo [1/4] Creando directorio de instalacion...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
)
mkdir "%INSTALL_DIR%" >nul 2>&1

echo [2/4] Copiando archivos...
xcopy /e /i /q /y "%APP_DIR%\*" "%INSTALL_DIR%" >nul 2>&1

echo [3/4] Creando acceso directo en el escritorio...
powershell -Command "$WSH = New-Object -ComObject WScript.Shell; $SC = $WSH.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Sistema Inventario.lnk'); $SC.TargetPath = '%INSTALL_DIR%\Sistema Inventario.exe'; $SC.WorkingDirectory = '%INSTALL_DIR%'; $SC.Description = 'Sistema de Inventario'; $SC.Save()" >nul 2>&1

echo [4/4] Creando acceso directo en menu Inicio...
powershell -Command "$SM = [Environment]::GetFolderPath('Programs') + '\Sistema Inventario'; if (!(Test-Path $SM)) { mkdir $SM >nul }; $WSH = New-Object -ComObject WScript.Shell; $SC = $WSH.CreateShortcut($SM + '\Sistema Inventario.lnk'); $SC.TargetPath = '%INSTALL_DIR%\Sistema Inventario.exe'; $SC.WorkingDirectory = '%INSTALL_DIR%'; $SC.Description = 'Sistema de Inventario'; $SC.Save()" >nul 2>&1

echo.
echo ============================================
echo   Instalacion completada!
echo ============================================
echo.
echo  El Sistema de Inventario se ha instalado en:
echo    %INSTALL_DIR%
echo.
echo  Puedes ejecutarlo desde:
echo    - Menu Inicio ^> Sistema Inventario
echo    - Acceso directo en el escritorio
echo.
pause
