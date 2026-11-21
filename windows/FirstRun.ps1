$ErrorActionPreference = "Stop"
$Root = Join-Path $env:ProgramData "FerahAuto\Server"
$Data = Join-Path $Root "data"
New-Item -ItemType Directory -Force -Path $Data | Out-Null
$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) {
  $bytes = New-Object byte[] 48
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes); $rng.Dispose()
  $secret = [Convert]::ToBase64String($bytes)
  @"
HOST=0.0.0.0
PORT=8787
DATA_DIR=$Data
JWT_SECRET=$secret
ALLOWED_ORIGINS=http://localhost:3000
CLOUD_SYNC_ENABLED=false
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
"@ | Set-Content -Encoding UTF8 $envFile
}
$node = Join-Path $Root "runtime\node.exe"
if (-not (Test-Path $node)) { throw "Bundled Node runtime missing." }
$action = New-ScheduledTaskAction -Execute $node -Argument "src/server.js" -WorkingDirectory $Root
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "FERAH AUTO Local Server" -Action $action -Trigger $trigger -RunLevel Highest -User "SYSTEM" -Force | Out-Null
New-NetFirewallRule -DisplayName "FERAH AUTO Local Server TCP 8787" -Direction Inbound -Protocol TCP -LocalPort 8787 -Action Allow -Profile Private -ErrorAction SilentlyContinue | Out-Null
Start-ScheduledTask -TaskName "FERAH AUTO Local Server"
Start-Sleep -Seconds 3
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 5
  if (-not $health.ok) { throw "Health check failed." }
} catch { throw "FERAH AUTO server did not pass its local health check: $($_.Exception.Message)" }
Write-Output "FERAH AUTO local server installed and started. LAN port: 8787"
