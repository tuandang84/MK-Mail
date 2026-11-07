# Script to build a 64-bit Windows MSI installer for MK-Mail using WiX Toolset
param(
    [string]$SourceDir = "",
    [string]$OutputDir = "",
    [string]$MsiName = "MK-Mail-Setup-x64.msi"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$appDir = Resolve-Path (Join-Path $scriptDir "..\..")
$rootDir = Resolve-Path (Join-Path $appDir "..")

if (-not $SourceDir) {
    $SourceDir = Join-Path $appDir "dist\mailspring-win32-x64"
}
if (-not $OutputDir) {
    $OutputDir = Join-Path $appDir "dist"
}

Write-Host "=== Building MK-Mail Windows x64 MSI Installer ==="
Write-Host "App Directory:    $appDir"
Write-Host "Source Directory: $SourceDir"
Write-Host "Output Directory: $OutputDir"

if (-not (Test-Path $SourceDir)) {
    Write-Error "Source directory not found: $SourceDir. Make sure 'npm run build' ran successfully."
    exit 1
}

# 1. Locate WiX Toolset binaries
$wixCandidates = @(
    $env:WIX,
    "C:\Program Files (x86)\WiX Toolset v3.11\bin",
    "C:\Program Files\WiX Toolset v3.11\bin",
    "C:\ProgramData\chocolatey\bin"
)

$wixBin = ""
if (Get-Command "candle.exe" -ErrorAction SilentlyContinue) {
    $wixBin = Split-Path -Parent (Get-Command "candle.exe").Source
} else {
    foreach ($cand in $wixCandidates) {
        if ($cand -and (Test-Path (Join-Path $cand "candle.exe"))) {
            $wixBin = $cand
            break
        }
    }
}

if (-not $wixBin) {
    Write-Host "WiX Toolset not found in PATH or standard locations. Installing via Chocolatey..."
    choco install wixtoolset -y
    $wixBin = "C:\Program Files (x86)\WiX Toolset v3.11\bin"
}

Write-Host "Using WiX Toolset from: $wixBin"
$heatExe = Join-Path $wixBin "heat.exe"
$candleExe = Join-Path $wixBin "candle.exe"
$lightExe = Join-Path $wixBin "light.exe"

# 2. Extract Version from package.json
$packageJsonPath = Join-Path $appDir "package.json"
$rawVersion = (Get-Content $packageJsonPath | ConvertFrom-Json).version
if ($rawVersion -match '^(\d+\.\d+\.\d+)') {
    $version = $matches[1]
} else {
    $version = "1.0.0"
}
Write-Host "MK-Mail Version: $version"

# 3. Locate Main Executable & Icon
$exeName = "Mailspring.exe"
if (Test-Path (Join-Path $SourceDir "mailspring.exe")) {
    $exeName = "mailspring.exe"
} elseif (Test-Path (Join-Path $SourceDir "Mailspring.exe")) {
    $exeName = "Mailspring.exe"
}
Write-Host "Main Executable: $exeName"

$iconPath = Join-Path $appDir "build\resources\win\mailspring-square.ico"
if (-not (Test-Path $iconPath)) {
    Write-Error "Icon file not found: $iconPath"
    exit 1
}

# 4. Prepare directories
$objDir = Join-Path $scriptDir "obj"
if (Test-Path $objDir) {
    Remove-Item -Recurse -Force $objDir
}
New-Item -ItemType Directory -Path $objDir -Force | Out-Null
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$appFilesWxs = Join-Path $objDir "AppFiles.wxs"
$mainWxs = Join-Path $scriptDir "MK-Mail.wxs"
$finalMsi = Join-Path $OutputDir $MsiName

# 4b. Slim: prune debug/symbol artifacts from the packaged folder before
# harvesting, so they never end up in the MSI cabinet (this was the main
# reason the first MSI was 309 MB).
$debugFiles = Get-ChildItem -Path $SourceDir -Recurse -File -Include *.pdb,*.exp,*.lib,*.ilk,*.iobj,*.ipdb -ErrorAction SilentlyContinue
if ($debugFiles) {
    $prunedMB = [math]::Round(($debugFiles | Measure-Object Length -Sum).Sum / 1MB, 2)
    Write-Host "Slim: removing $($debugFiles.Count) debug file(s) from package ($prunedMB MB)..."
    $debugFiles | Remove-Item -Force -ErrorAction SilentlyContinue
}
$pkgSizeMB = [math]::Round((Get-ChildItem -Path $SourceDir -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 2)
Write-Host "Package folder size before MSI: $pkgSizeMB MB"

# 5. Harvest files using heat.exe
Write-Host "Harvesting files with heat.exe..."
& $heatExe dir "$SourceDir" -cg AppFiles -dr INSTALLFOLDER -scom -sreg -srd -sfrag -ag -var var.SourceDir -out "$appFilesWxs"
if ($LASTEXITCODE -ne 0) {
    Write-Error "heat.exe failed with exit code $LASTEXITCODE"
    exit 1
}

# 6. Compile WiX sources using candle.exe (-arch x64)
Write-Host "Compiling with candle.exe (x64)..."
$candleArgs = @(
    "-arch", "x64",
    "-dAppVersion=$version",
    "-dIconPath=$iconPath",
    "-dExeName=$exeName",
    "-dSourceDir=$SourceDir",
    "$mainWxs",
    "$appFilesWxs",
    "-out", "$objDir\"
)
& $candleExe $candleArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "candle.exe failed with exit code $LASTEXITCODE"
    exit 1
}

# 7. Link MSI using light.exe
Write-Host "Linking MSI with light.exe..."
$lightArgs = @(
    "-sval",
    "-out", "$finalMsi",
    (Join-Path $objDir "MK-Mail.wixobj"),
    (Join-Path $objDir "AppFiles.wixobj")
)
& $lightExe $lightArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "light.exe failed with exit code $LASTEXITCODE"
    exit 1
}

if (-not (Test-Path $finalMsi)) {
    Write-Error "MSI output file was not created: $finalMsi"
    exit 1
}

$fileSizeMB = [math]::Round((Get-Item $finalMsi).Length / 1MB, 2)
Write-Host "=== Successfully built MSI Installer! ==="
Write-Host "Output: $finalMsi ($fileSizeMB MB)"
