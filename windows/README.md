# FERAH AUTO — Tek Kurulum

Son kullanıcı yalnızca `FERAH-AUTO-TEK-KURULUM.exe` dosyasını çalıştırır. Kurulum sihirbazı yönetici izniyle tek seferde:
1. Sunucu dosyalarını ProgramData altına yerleştirir.
2. Paket içindeki Node.js çalışma zamanını kullanır; kullanıcıdan Node.js/Git/npm kurmasını istemez.
3. Yerel veri klasörünü ve rastgele imzalama anahtarını oluşturur.
4. Windows başlangıç görevi ve yalnızca Private ağ profiline açık güvenlik duvarı kuralı kurar.
5. Sunucuyu başlatır ve /health kontrolü yapar.

## Tek EXE üretimi (geliştirici bilgisayarında)
- Windows x64 derleme makinesi gerekir.
- Derleme makinesinde Node.js/npm ve Inno Setup 6 bulunmalıdır.
- `powershell -ExecutionPolicy Bypass -File windows/build-single-setup.ps1`
- Çıktı: `release/FERAH-AUTO-TEK-KURULUM.exe`

Son kullanıcı bilgisayarında Node.js, Git veya npm ayrıca kurulmaz.

## Önemli durum
Bu paket şu an yerel sunucu temelini kurar. Mevcut FERAH AUTO iş ekranlarının 14 tablo için yerel API'ye taşınması ve gerçek bulut senkronizasyonu tamamlanmadan üretim verisiyle çevrimdışı servis olarak kullanılmamalıdır. APK ayrı bir Android uygulama çıktısıdır; sunucu EXE'sine gömülmez.
