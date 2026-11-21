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
Push-Location (Join-Path $RepoRoot "local-server")
try {
  & $npm install --omit=dev
  if ($LASTEXITCODE -ne 0) { throw "Production dependencies install failed." }
} finally { Pop-Location; $env:PATH = $oldPath }

$iscc = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if (-not $iscc) {
  $knownIscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"
  if (Test-Path $knownIscc) { $isccPath = $knownIscc }
  else { throw "Inno Setup 6 compiler (ISCC.exe) was not found." }
} else { $isccPath = $iscc.Source }
& $isccPath (Join-Path $WindowsDir "FerahAuto.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }
Write-Host "Single installer created: $(Join-Path $ReleaseDir 'FERAH-AUTO-TEK-KURULUM.exe')"
