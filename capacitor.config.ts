import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ferahauto.mobile",
  appName: "FERAH AUTO",
  webDir: "www",
  server: {
    url: "https://ferah-auto-service-management.vercel.app/",
    cleartext: false,
    androidScheme: "https"
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
