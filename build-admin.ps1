param([switch]$Elevated)

if (-NOT $Elevated) {
    $psi = Start-Process -Verb RunAs -FilePath powershell.exe -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Elevated" -Wait -PassThru
    exit $psi.ExitCode
}

$ErrorActionPreference = "Continue"
$projectDir = $PSScriptRoot
$logFile = Join-Path $projectDir "dist\build-log.txt"

New-Item -ItemType Directory -Path (Join-Path $projectDir "dist") -Force | Out-Null

function Log($msg) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    "$timestamp $msg" | Out-File -FilePath $logFile -Append
    Write-Host $msg
}

Log "=== Build started ==="
Log "Running as admin"

$wcsDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
Remove-Item -Path "$wcsDir\*.7z" -Force -ErrorAction SilentlyContinue
Log "Cache cleaned"

Set-Location -LiteralPath $projectDir
Log "Building..."

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$result = & ".\node_modules\.bin\electron-builder.cmd" --win --x64 2>&1
$result | Out-File -FilePath $logFile -Append
$exitCode = $LASTEXITCODE
Log "Exit code: $exitCode"

$installer = Get-ChildItem -Path ".\dist" -Filter "*Installer*" -ErrorAction SilentlyContinue
if ($installer) {
    Log "SUCCESS: Installer at $($installer[0].FullName)"
} else {
    Log "FAILED: No installer"
}

Log "=== Done ==="
Read-Host "Press Enter"
