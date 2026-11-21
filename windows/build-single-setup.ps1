$ErrorActionPreference = "Stop"
$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $WindowsDir
$RuntimeDir = Join-Path $WindowsDir "runtime"
$ReleaseDir = Join-Path $RepoRoot "release"
$NodeVersion = "v22.23.5"
$Zip = Join-Path $env:TEMP "ferah-auto-node-$NodeVersion-win-x64.zip"
$Extract = Join-Path $env:TEMP "node-$NodeVersion-win-x64"

New-Item -ItemType Directory -Force -Path $RuntimeDir,$ReleaseDir | Out-Null
if (-not (Test-Path (Join-Path $RuntimeDir "node.exe"))) {
  $url = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip"
  Invoke-WebRequest -Uri $url -OutFile $Zip
  if (Test-Path $Extract) { Remove-Item $Extract -Recurse -Force }
  Expand-Archive -Path $Zip -DestinationPath $env:TEMP -Force
  Copy-Item (Join-Path $Extract "node.exe") $RuntimeDir -Force
  Copy-Item (Join-Path $Extract "npm.cmd") $RuntimeDir -Force
  Copy-Item (Join-Path $Extract "npm") $RuntimeDir -Recurse -Force
  Copy-Item (Join-Path $Extract "node_modules") $RuntimeDir -Recurse -Force
}
$node = Join-Path $RuntimeDir "node.exe"
$npm = Join-Path $RuntimeDir "npm.cmd"
if (-not (Test-Path $node) -or -not (Test-Path $npm)) { throw "Bundled Node.js build runtime is incomplete." }

$oldPath = $env:PATH
$env:PATH = "$RuntimeDir;$oldPath"
Push-Location $RepoRoot
try {
  & $npm ci
  if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
  & $npm run build
  if ($LASTEXITCODE -ne 0) { throw "Next.js production build failed." }
} finally { Pop-Location; $env:PATH = $oldPath }

$standalone = Join-Path $RepoRoot ".next\standalone"
if (-not (Test-Path (Join-Path $standalone "server.js"))) { throw "Next.js standalone server.js was not generated." }
$staticSource = Join-Path $RepoRoot ".next\static"
$staticTarget = Join-Path $standalone ".next\static"
New-Item -ItemType Directory -Force -Path (Split-Path $staticTarget -Parent) | Out-Null
if (Test-Path $staticSource) { Copy-Item $staticSource $staticTarget -Recurse -Force }
$publicSource = Join-Path $RepoRoot "public"
if (Test-Path $publicSource) { Copy-Item $publicSource (Join-Path $standalone "public") -Recurse -Force }

$iscc = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if (-not $iscc) {
  $knownIscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"
  if (Test-Path $knownIscc) { $isccPath = $knownIscc }
  else { throw "Inno Setup 6 compiler (ISCC.exe) was not found." }
} else { $isccPath = $iscc.Source }
& $isccPath (Join-Path $WindowsDir "FerahAuto.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }
$installer = Join-Path $ReleaseDir "FERAH-AUTO-TEK-KURULUM.exe"
if (-not (Test-Path $installer)) { throw "Installer output is missing." }
Write-Host "FERAH AUTO desktop application installer created: $installer"
