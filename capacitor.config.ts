import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ferahauto.mobile",
  appName: "FERAH AUTO",
  webDir: "www",
  server: {
    allowNavigation: ["ferah-auto-service-management.vercel.app"]
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
