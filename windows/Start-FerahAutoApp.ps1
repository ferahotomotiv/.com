param([switch]$ServerOnly)
$ErrorActionPreference = 'Stop'
$Root = Join-Path $env:ProgramData 'FerahAuto'
$AppDir = Join-Path $Root 'App'
$Node = Join-Path $Root 'Server\runtime\node.exe'
$Entry = Join-Path $AppDir 'server.js'
$Port = 3000
if (-not (Test-Path $Node)) { throw 'FERAH AUTO runtime is missing.' }
if (-not (Test-Path $Entry)) { throw 'FERAH AUTO application package is missing.' }
$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listener) { $env:PORT = "$Port"; $env:HOSTNAME = '0.0.0.0'; Start-Process -FilePath $Node -ArgumentList 'server.js' -WorkingDirectory $AppDir -WindowStyle Hidden }
$ready = $false
for ($i = 0; $i -lt 40; $i++) { try { $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -TimeoutSec 2 -UseBasicParsing; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { $ready = $true; break } } catch { Start-Sleep -Milliseconds 750 } }
if (-not $ready) { throw 'FERAH AUTO web application did not become ready.' }
if (-not $ServerOnly) { Start-Process "http://127.0.0.1:$Port/login" }
