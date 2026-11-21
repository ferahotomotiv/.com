$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodePathFile = Join-Path $Root "node-path.txt"
if (-not (Test-Path $NodePathFile)) { exit 2 }
$NodeExe = (Get-Content $NodePathFile -Raw).Trim()
if (-not (Test-Path $NodeExe)) { exit 3 }
$existing = Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -like "*$Root*src/server.js*" }
if (-not $existing) {
  Start-Process -FilePath $NodeExe -ArgumentList "src/server.js" -WorkingDirectory $Root -WindowStyle Hidden
}
