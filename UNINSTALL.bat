@echo off
title Desinstalar Sistema de Inventario
cd /d "%~dp0"

echo ============================================
echo   Desinstalar Sistema de Inventario
echo ============================================
echo.

:: Solicitar admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0' -Wait"
    exit /b
)

:: Eliminar archivos del programa
set "INSTALL_DIR=%ProgramFiles%\Sistema Inventario"
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
    echo [OK] Archivos eliminados de: %INSTALL_DIR%
) else (
    echo [--] No se encontro: %INSTALL_DIR%
)

:: Eliminar accesos directos
set "DESKTOP_LNK=%USERPROFILE%\Desktop\Sistema Inventario.lnk"
if exist "%DESKTOP_LNK%" (
    del /f /q "%DESKTOP_LNK%" >nul 2>&1
    echo [OK] Acceso directo del escritorio eliminado
)

set "PUBLIC_DESKTOP_LNK=%PUBLIC%\Desktop\Sistema Inventario.lnk"
if exist "%PUBLIC_DESKTOP_LNK%" (
    del /f /q "%PUBLIC_DESKTOP_LNK%" >nul 2>&1
)

set "START_MENU=%ProgramData%\Microsoft\Windows\Start Menu\Programs\Sistema Inventario"
if exist "%START_MENU%" (
    rmdir /s /q "%START_MENU%" >nul 2>&1
    echo [OK] Acceso directo del menu Inicio eliminado
)

set "START_MENU2=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Sistema Inventario"
if exist "%START_MENU2%" (
    rmdir /s /q "%START_MENU2%" >nul 2>&1
)

:: Preguntar si eliminar base de datos local
echo.
echo ? Deseas eliminar tambien la base de datos y configuracion?
echo   (Esto borrara todos los productos registrados)
echo.
set /p "DEL_DATA=   ? (S/N): "
if /i "%DEL_DATA%"=="S" (
    set "USER_DATA=%APPDATA%\sistema-inventario"
    if exist "%USER_DATA%" (
        rmdir /s /q "%USER_DATA%" >nul 2>&1
        echo [OK] Datos de usuario eliminados: %USER_DATA%
    )
    set "USER_DATA2=%LOCALAPPDATA%\sistema-inventario"
    if exist "%USER_DATA2%" (
        rmdir /s /q "%USER_DATA2%" >nul 2>&1
        echo [OK] Datos locales eliminados
    )
)

echo.
echo ============================================
echo   Desinstalacion completada
echo ============================================
echo.
echo El Sistema de Inventario ha sido eliminado.
echo.
pause
