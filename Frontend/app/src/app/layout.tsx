import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time — ZERO runtime CDN requests
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tethered Balloon Monitoring System",
  description:
    "Tethered Balloon Geospatial Intelligence Monitoring System — Video Analytics, Crowd Counting, Object Detection, GEO Visualization. 180 Aerostat Platform.",
  keywords: "geoint, tethered balloon, aerostat, surveillance, crowd counting, epsilon gimbal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
