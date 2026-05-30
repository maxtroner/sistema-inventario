param(
  [string]$InstallDir = "$env:ProgramFiles\Sistema Inventario",
  [switch]$CreateDesktopShortcut = $true,
  [switch]$CreateStartMenuShortcut = $true,
  [switch]$Silent = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceDir = Join-Path $ScriptDir "dist\win-unpacked"

function Write-Log {
  param([string]$Message)
  if (-not $Silent) {
    Write-Host $Message -ForegroundColor Cyan
  }
}

# Check if source exists
if (-not (Test-Path $SourceDir)) {
  Write-Host "ERROR: No se encontró la aplicación compilada en: $SourceDir" -ForegroundColor Red
  Write-Host "Ejecuta primero: npm run build" -ForegroundColor Yellow
  exit 1
}

# Check for admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Solicitando permisos de administrador..." -ForegroundColor Yellow
  $arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -InstallDir `"$InstallDir`""
  if ($CreateDesktopShortcut) { $arguments += " -CreateDesktopShortcut" }
  if ($CreateStartMenuShortcut) { $arguments += " -CreateStartMenuShortcut" }
  Start-Process -Verb RunAs -FilePath powershell.exe -ArgumentList $arguments -Wait
  exit
}

Write-Log "=== Instalando Sistema de Inventario ==="
Write-Log ""

# Create installation directory
Write-Log "[1/4] Creando directorio de instalación..."
if (Test-Path $InstallDir) {
  Remove-Item -Recurse -Force "$InstallDir\*" -ErrorAction SilentlyContinue
} else {
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Copy files
Write-Log "[2/4] Copiando archivos..."
Copy-Item "$SourceDir\*" $InstallDir -Recurse -Force

# Create desktop shortcut
if ($CreateDesktopShortcut) {
  Write-Log "[3/4] Creando acceso directo en el escritorio..."
  $WshShell = New-Object -ComObject WScript.Shell
  $shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Sistema Inventario.lnk")
  $shortcut.TargetPath = "$InstallDir\Sistema Inventario.exe"
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.Description = "Sistema de Inventario"
  $shortcut.Save()
}

# Create start menu shortcut
if ($CreateStartMenuShortcut) {
  Write-Log "[4/4] Creando acceso directo en el menú Inicio..."
  $startMenuDir = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Sistema Inventario"
  if (-not (Test-Path $startMenuDir)) {
    New-Item -ItemType Directory -Path $startMenuDir -Force | Out-Null
  }
  $WshShell = New-Object -ComObject WScript.Shell
  $shortcut = $WshShell.CreateShortcut("$startMenuDir\Sistema Inventario.lnk")
  $shortcut.TargetPath = "$InstallDir\Sistema Inventario.exe"
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.Description = "Sistema de Inventario"
  $shortcut.Save()
}

Write-Log ""
Write-Log "=== Instalación completada ===" -ForegroundColor Green
Write-Log "El Sistema de Inventario se ha instalado en: $InstallDir" -ForegroundColor Green
Write-Log "Ejecuta 'Sistema Inventario' desde el menú Inicio o el acceso directo en el escritorio." -ForegroundColor Green
