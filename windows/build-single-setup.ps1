$ErrorActionPreference = "Stop"
$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $WindowsDir
$DesktopDir = Join-Path $RepoRoot "desktop"
$AppDir = Join-Path $WindowsDir "app"
$ReleaseDir = Join-Path $RepoRoot "release"

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
if (Test-Path $AppDir) { Remove-Item $AppDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

Push-Location $RepoRoot
try {
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
  npm install --no-save --no-audit --no-fund electron@22.3.27
  if ($LASTEXITCODE -ne 0) { throw "Electron runtime installation failed." }
} finally { Pop-Location }

$ElectronDist = Join-Path $RepoRoot "node_modules\electron\dist"
if (-not (Test-Path (Join-Path $ElectronDist "electron.exe"))) { throw "Electron Windows runtime was not installed." }
Copy-Item (Join-Path $ElectronDist "*") $AppDir -Recurse -Force
$ResourcesDir = Join-Path $AppDir "resources\app"
New-Item -ItemType Directory -Force -Path $ResourcesDir | Out-Null
Copy-Item (Join-Path $DesktopDir "main.js") $ResourcesDir -Force
Copy-Item (Join-Path $DesktopDir "package.json") $ResourcesDir -Force

$BrandLogo = Join-Path $RepoRoot "public\branding\Metalik Ferah Auto Kalkan Logosu.png"
if (Test-Path $BrandLogo) {
  Copy-Item $BrandLogo (Join-Path $ResourcesDir "ferah-auto-logo.png") -Force
  Copy-Item $BrandLogo (Join-Path $AppDir "ferah-auto-logo.png") -Force
}

$iscc = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if (-not $iscc) {
  $knownIscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"
  if (Test-Path $knownIscc) { $isccPath = $knownIscc }
  else { throw "Inno Setup 6 compiler (ISCC.exe) was not found." }
} else { $isccPath = $iscc.Source }

& $isccPath (Join-Path $WindowsDir "FerahAuto.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }
$installer = Join-Path $ReleaseDir "FERAH-AUTO-WINDOWS-KURULUM.exe"
if (-not (Test-Path $installer)) { throw "Installer output is missing." }
Write-Host "Created: $installer"
