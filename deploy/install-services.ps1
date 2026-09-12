# Install/uninstall Backend & Frontend Balloon Media Enhance sebagai Windows Service
# (via NSSM), auto-start saat boot, tanpa jendela cmd/terminal yang muncul.
#
# Cara pakai:
#   Install : klik kanan file ini -> "Run with PowerShell" (akan minta admin otomatis)
#             atau dari PowerShell elevated: .\install-services.ps1
#   Uninstall: .\install-services.ps1 -Uninstall

param(
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

# --- Minta hak Administrator kalau belum ---
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Meminta hak Administrator..."
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
    if ($Uninstall) { $argList += '-Uninstall' }
    Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs
    exit
}

$RepoRoot    = Split-Path -Parent $PSScriptRoot
$BackendDir  = Join-Path $RepoRoot 'Backend'
$FrontendDir = Join-Path $RepoRoot 'Frontend\app'
$LogDir      = Join-Path $RepoRoot 'logs'
$PythonExe   = 'C:\Users\rizal\AppData\Local\Python\pythoncore-3.11-64\python.exe'
$NodeExe     = 'C:\Program Files\nodejs\node.exe'
$NpmCmd      = 'C:\Program Files\nodejs\npm.cmd'
$NextBin     = Join-Path $FrontendDir 'node_modules\next\dist\bin\next'

$BackendSvc  = 'BalloonBackend'
$FrontendSvc = 'BalloonFrontend'

if (-not (Test-Path $PythonExe)) { throw "Python interpreter tidak ditemukan di $PythonExe (interpreter dengan torch/ultralytics terinstall)." }
if (-not (Test-Path $NodeExe))   { throw "Node.js tidak ditemukan di $NodeExe" }

function Find-Nssm {
    $cmd = Get-Command nssm.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $found = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter 'nssm.exe' -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\win64\\' } | Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

function Ensure-Nssm {
    $path = Find-Nssm
    if ($path) { return $path }
    Write-Host "NSSM tidak ditemukan, menginstall via winget..."
    winget install -e --id NSSM.NSSM --accept-source-agreements --accept-package-agreements | Out-Null
    Start-Sleep -Seconds 2
    $path = Find-Nssm
    if (-not $path) {
        throw "Gagal menemukan nssm.exe setelah instalasi winget. Install manual dari https://nssm.cc lalu jalankan ulang skrip ini."
    }
    return $path
}

function Install-AppService {
    param(
        [string]$Name,
        [string]$DisplayName,
        [string]$Exe,
        [string]$Params,
        [string]$WorkDir,
        [string]$DependOn,
        [string]$ExtraEnv
    )
    if (Get-Service -Name $Name -ErrorAction SilentlyContinue) {
        Write-Host "Service $Name sudah ada, menghapus untuk reinstall..."
        & $nssm stop $Name 2>$null | Out-Null
        & $nssm remove $Name confirm | Out-Null
    }
    Write-Host "Install service $Name..."
    & $nssm install $Name $Exe
    & $nssm set $Name AppParameters $Params
    & $nssm set $Name AppDirectory $WorkDir
    & $nssm set $Name DisplayName $DisplayName
    & $nssm set $Name Start SERVICE_AUTO_START
    & $nssm set $Name AppStdout (Join-Path $LogDir "$Name-out.log")
    & $nssm set $Name AppStderr (Join-Path $LogDir "$Name-err.log")
    & $nssm set $Name AppRotateFiles 1
    & $nssm set $Name AppRotateBytes 5242880
    & $nssm set $Name AppExit Default Restart
    if ($DependOn) { & $nssm set $Name DependOnService $DependOn }
    if ($ExtraEnv) { & $nssm set $Name AppEnvironmentExtra $ExtraEnv }
}

if ($Uninstall) {
    $nssm = Find-Nssm
    if ($nssm) {
        foreach ($svc in @($FrontendSvc, $BackendSvc)) {
            if (Get-Service -Name $svc -ErrorAction SilentlyContinue) {
                Write-Host "Menghentikan & menghapus service $svc..."
                & $nssm stop $svc 2>$null | Out-Null
                & $nssm remove $svc confirm | Out-Null
            }
        }
    }
    Write-Host "Selesai uninstall."
    Read-Host "Tekan Enter untuk menutup"
    exit
}

$nssm = Ensure-Nssm
Write-Host "Memakai nssm: $nssm"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host "Menginstall dependencies & build frontend (production)..."
Push-Location $FrontendDir
& $NpmCmd install
if ($LASTEXITCODE -ne 0) { throw "npm install gagal" }
& $NpmCmd run build
if ($LASTEXITCODE -ne 0) { throw "npm run build gagal" }
Pop-Location

if (-not (Test-Path $NextBin)) { throw "Tidak menemukan next bin di $NextBin" }

Install-AppService -Name $BackendSvc -DisplayName 'Balloon Media Enhance - Backend' `
    -Exe $PythonExe -Params '-m uvicorn main:app --host 127.0.0.1 --port 8000' `
    -WorkDir $BackendDir

Install-AppService -Name $FrontendSvc -DisplayName 'Balloon Media Enhance - Frontend' `
    -Exe $NodeExe -Params "`"$NextBin`" start -p 3000" `
    -WorkDir $FrontendDir -DependOn $BackendSvc -ExtraEnv 'NODE_ENV=production'

Write-Host "Menjalankan services..."
& $nssm start $BackendSvc
Start-Sleep -Seconds 3
& $nssm start $FrontendSvc

Write-Host ""
Write-Host "Selesai."
Write-Host "Backend  : http://127.0.0.1:8000/docs"
Write-Host "Frontend : http://127.0.0.1:3000"
Write-Host "Cek status : Get-Service $BackendSvc,$FrontendSvc"
Write-Host "Log ada di : $LogDir"
Read-Host "Tekan Enter untuk menutup"
