# FERAH AUTO Windows masaüstü kurulumu

Bu kurulum, mevcut FERAH AUTO web uygulamasını Electron masaüstü penceresinde açar. Veriler, kimlik doğrulama ve yetkilendirme mevcut Supabase altyapısında kalır. Yerel Node sunucusu, LAN sunucusu, yerel veritabanı veya çevrimdışı eşitleme kurulmaz.

- Tek kurulum dosyası: `release/FERAH-AUTO-WINDOWS-KURULUM.exe`
- Hedef: 64-bit Windows 8, 8.1, 10 ve 11.
- İnternet bağlantısı gereklidir.
- Kurulum Electron 22.3.27 kullanır; bu sürüm Windows 8/8.1 uyumluluğu için seçilmiştir ve artık güvenlik desteği almamaktadır. Eski Windows desteği güvenlik bakımından sınırlama oluşturur.
- Windows 10/11 için de aynı eski runtime kullanıldığı için bu paket genel kullanım açısından en güncel güvenlik seviyesinde değildir.

GitHub Actions, Windows kurulum dosyasını üretir. Kurulumun başarıyla derlenmesi, uygulamanın canlı Vercel adresine eriştiğinin veya tüm işletim sistemlerinde uçtan uca test edildiğinin kanıtı değildir.
