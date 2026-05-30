param(
  [switch]$Admin
)

if (-NOT $Admin) {
  $arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Admin"
  Start-Process -Verb RunAs -FilePath powershell.exe -ArgumentList $arguments -Wait
  exit
}

Set-Location -LiteralPath $PSScriptRoot

Write-Host "=== Sistema de Inventario - Builder ===" -ForegroundColor Cyan
Write-Host ""

# 1. Build the package
Write-Host "[1/3] Building application..." -ForegroundColor Yellow
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

# Remove cached archives that cause extraction issues
$wcsCache = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
if (Test-Path $wcsCache) {
  Get-ChildItem -Path $wcsCache -Filter "*.7z" | Remove-Item -Force -ErrorAction SilentlyContinue
}

npx electron-builder --win --x64 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "electron-builder failed. Building portable only..." -ForegroundColor Yellow
  npx electron-builder --win portable --x64 2>&1
}

# 2. Check results
Write-Host ""
Write-Host "[2/3] Checking build results..." -ForegroundColor Yellow
$distDir = Join-Path $PSScriptRoot "dist"
$installers = Get-ChildItem -Path $distDir -Filter "*.exe" -Recurse | Where-Object { $_.Name -like "*Installer*" }
$portable = Get-ChildItem -Path $distDir -Filter "*.exe" -Recurse | Where-Object { $_.Name -like "*portable*" -or $_.Name -like "*Sistema Inventario*" }

if ($installers) {
  Write-Host "Installer created: $($installers[0].FullName)" -ForegroundColor Green
} elseif (Test-Path (Join-Path $distDir "win-unpacked")) {
  Write-Host "Portable app built at: $distDir\win-unpacked" -ForegroundColor Green
}

# 3. Create ZIP backup
Write-Host ""
Write-Host "[3/3] Creating portable ZIP..." -ForegroundColor Yellow
$zipPath = Join-Path $distDir "Sistema-Inventario-Portable.zip"
if (Test-Path (Join-Path $distDir "win-unpacked")) {
  Compress-Archive -Path (Join-Path $distDir "win-unpacked\*") -DestinationPath $zipPath -Force
  Write-Host "Portable ZIP created: $zipPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run the app:"
Write-Host "  Portable: .\dist\win-unpacked\Sistema Inventario.exe"
if ($installers) {
  Write-Host "  Installer: $($installers[0].FullName)"
}
