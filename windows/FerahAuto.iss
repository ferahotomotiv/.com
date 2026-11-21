#define AppName "FERAH AUTO"
#define AppVersion "1.0.0"
#define AppPublisher "FERAH AUTO"
#define AppId "{{D2E8D2AA-7B7E-4F6C-9D30-FAE6D1A2B719}"

[Setup]
AppId={#AppId}
AppName={#AppName} Server
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\FERAH AUTO Server
DefaultGroupName=FERAH AUTO
OutputDir=..\release
OutputBaseFilename=FERAH-AUTO-TEK-KURULUM
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
PrivilegesRequired=admin
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=FERAH AUTO Server
CloseApplications=yes
RestartApplications=no

[Dirs]
Name: "{commonappdata}\FerahAuto\Server"; Permissions: users-modify
Name: "{commonappdata}\FerahAuto\Server\data"; Permissions: users-modify

[Files]
Source: "..\local-server\*"; DestDir: "{commonappdata}\FerahAuto\Server"; Flags: recursesubdirs ignoreversion
Source: "runtime\node.exe"; DestDir: "{commonappdata}\FerahAuto\Server\runtime"; Flags: ignoreversion
Source: "FirstRun.ps1"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{tmp}\FirstRun.ps1"""; Flags: runhidden waituntilterminated; StatusMsg: "FERAH AUTO sunucusu yapılandırılıyor..."
Filename: "http://127.0.0.1:8787/"; Description: "Kurulumdan sonra FERAH AUTO sunucu sayfasını aç"; Flags: postinstall shellexec skipifsilent

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Stop-ScheduledTask -TaskName 'FERAH AUTO Local Server' -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName 'FERAH AUTO Local Server' -Confirm:$false -ErrorAction SilentlyContinue; Remove-NetFirewallRule -DisplayName 'FERAH AUTO Local Server TCP 8787' -ErrorAction SilentlyContinue"""; Flags: runhidden

[Code]
function InitializeSetup(): Boolean;
begin
  Result := IsWin64;
  if not Result then
    MsgBox('FERAH AUTO Server için 64-bit Windows gereklidir.', mbCriticalError, MB_OK);
end;
