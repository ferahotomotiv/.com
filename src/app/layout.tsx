import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "FERAH AUTO | Service Management",
  description: "Ferah Otomotiv araç servis ve atölye yönetim sistemi.",
  applicationName: "FERAH AUTO",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}<Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" strategy="afterInteractive"/></body>
    </html>
  );
}
