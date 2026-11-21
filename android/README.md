# FERAH AUTO Android Client

Target compatibility: Android 8.0 (API 26) and newer.

The APK will be packaged with Capacitor after the web client is adapted to the local-first repository layer. It will support:
- LAN server address discovery/manual entry (for example http://192.168.1.20:8787 on the trusted workshop LAN).
- Secure local session storage.
- Offline action queue and retry when the LAN server becomes reachable.
- Camera/gallery access for vehicle intake and service photos.
- Push notifications when cloud connectivity is available; local in-app notifications remain available on LAN.
- Role-based screens matching the existing FERAH AUTO staff roles.

The APK is not yet a release binary. It must not be generated from the current cloud-only frontend and labelled offline-capable: the client-side data layer and API integration are prerequisites.
