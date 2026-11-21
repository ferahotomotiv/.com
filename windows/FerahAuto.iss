#define AppName "FERAH AUTO"
#define AppVersion "1.0.0"
#define AppPublisher "FERAH AUTO"
#define AppId "{{D2E8D2AA-7B7E-4F6C-9D30-FAE6D1A2B719}"

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\FERAH AUTO
DefaultGroupName=FERAH AUTO
OutputDir=..\release
OutputBaseFilename=FERAH-AUTO-WINDOWS-KURULUM
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
MinVersion=6.2
PrivilegesRequired=admin
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=FERAH AUTO
CloseApplications=yes
RestartApplications=no

[Files]
Source: "app\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{autoprograms}\FERAH AUTO"; Filename: "{app}\FERAH AUTO.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\FERAH AUTO"; Filename: "{app}\FERAH AUTO.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\FERAH AUTO.exe"; Description: "FERAH AUTO uygulamasını başlat"; Flags: postinstall nowait skipifsilent

[Code]
function InitializeSetup(): Boolean;
begin
  Result := IsWin64 and (GetWindowsVersion >= $06020000);
  if not IsWin64 then
    MsgBox('FERAH AUTO kurulumu için 64-bit Windows gereklidir.', mbCriticalError, MB_OK)
  else if GetWindowsVersion < $06020000 then
    MsgBox('FERAH AUTO için Windows 8 veya üzeri gereklidir.', mbCriticalError, MB_OK);
end;
