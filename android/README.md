# FERAH AUTO Android

Bu Android uygulaması, FERAH AUTO'nun mevcut mobil uyumlu web panelini uygulama penceresinde açar.

- Başlangıç adresi: https://ferah-auto-service-management.vercel.app/
- Kimlik doğrulama ve veriler mevcut Supabase altyapısında kalır.
- İnternet bağlantısı gereklidir.
- Yerel sunucu, LAN sunucusu, yerel veritabanı veya çevrimdışı eşitleme içermez.
- Android hedefi: API 26 (Android 8.0) ve üzeri.
- APK, GitHub Actions Android derlemesi tamamlandığında workflow artifact olarak yayımlanır.

Web panelinin mobil görünümü Android WebView içinde açılır. Web uygulamasının responsive tasarımı, giriş akışı ve mobil cihaz izinleri ayrıca gerçek cihazda doğrulanmalıdır.
