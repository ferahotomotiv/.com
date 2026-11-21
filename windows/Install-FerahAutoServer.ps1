# FERAH AUTO local server bootstrap for Windows 10 x64
# Run from an elevated PowerShell window.
$ErrorActionPreference = "Stop"
$Root = Join-Path $env:ProgramData "FerahAuto\Server"
$Source = Join-Path $PSScriptRoot "..\local-server"

if (-not (Test-Path $Source)) { throw "local-server folder not found. Run this script from the extracted FERAH AUTO package." }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "Node.js 20 LTS x64 is required. Install it from https://nodejs.org/en/download/ and rerun this script."
  exit 2
}
$major = [int]((& node -p "process.versions.node.split('.')[0]"))
if ($major -lt 20 -or $major -ge 23) { throw "Node.js 20.x or 22.x is required." }

New-Item -ItemType Directory -Force -Path $Root | Out-Null
Copy-Item -Path (Join-Path $Source "*") -Destination $Root -Recurse -Force
Push-Location $Root
try {
  if (-not (Test-Path ".env")) {
    $secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    @"
HOST=0.0.0.0
PORT=8787
DATA_DIR=$Root\data
JWT_SECRET=$secret
ALLOWED_ORIGINS=http://localhost:3000
CLOUD_SYNC_ENABLED=false
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
"@ | Set-Content -Encoding UTF8 ".env"
  }
  npm install --omit=dev
  if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
  New-NetFirewallRule -DisplayName "FERAH AUTO Local Server TCP 8787" -Direction Inbound -Protocol TCP -LocalPort 8787 -Action Allow -Profile Private -ErrorAction SilentlyContinue | Out-Null
  Write-Host "Local server files installed to $Root"
  Write-Host "Next: run 'node scripts/create-admin.js', then 'npm start'."
  Write-Host "Do not expose port 8787 to the public internet."
} finally { Pop-Location }
