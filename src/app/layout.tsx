import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FERAH AUTO | Service Management",
  description: "Ferah Otomotiv araç servis ve atölye yönetim sistemi.",
  applicationName: "FERAH AUTO",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
