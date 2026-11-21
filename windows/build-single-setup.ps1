$ErrorActionPreference = "Stop"
$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $WindowsDir
$RuntimeDir = Join-Path $WindowsDir "runtime"
$ReleaseDir = Join-Path $RepoRoot "release"
$NodeVersion = "v20.20.0"
$Zip = Join-Path $env:TEMP "ferah-auto-node-$NodeVersion-win-x64.zip"
$Extract = Join-Path $env:TEMP "ferah-auto-node-$NodeVersion"

New-Item -ItemType Directory -Force -Path $RuntimeDir,$ReleaseDir | Out-Null
if (-not (Test-Path (Join-Path $RuntimeDir "node.exe"))) {
  $url = "https://nodejs.org/dist/$NodeVersion/win-x64/node.exe"
  Invoke-WebRequest -Uri $url -OutFile (Join-Path $RuntimeDir "node.exe")
}
$node = Join-Path $RuntimeDir "node.exe"
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) { throw "Build computer needs Node.js/npm to compile native production dependencies. The resulting customer setup will not require Node.js." }

Push-Location (Join-Path $RepoRoot "local-server")
try {
  & npm.cmd install --omit=dev
  if ($LASTEXITCODE -ne 0) { throw "Production dependencies install failed." }
} finally { Pop-Location }

$iscc = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if (-not $iscc) { throw "Install Inno Setup 6 on the build computer, then rerun this script. End users will receive only one setup EXE." }
& $iscc.Source (Join-Path $WindowsDir "FerahAuto.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }
Write-Host "Single installer created: $(Join-Path $ReleaseDir 'FERAH-AUTO-TEK-KURULUM.exe')"
