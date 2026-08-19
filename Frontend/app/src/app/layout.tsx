import type { Metadata, Viewport } from 'next';
import './globals.css';
import './premium.css';
import './fx.css';
import './auth.css';
import './media.css';
import './notifications.css';
import './sidebar.css';
/* Mikrointeraksi dimuat setelah seluruh lembar komponen agar keadaan
   sorot, fokus, dan tekan yang didefinisikan di sini menang. */
import './motion.css';
/* Dimuat terakhir: menyelaraskan seluruh lapisan di atas untuk mode terang. */
import './theme-light.css';

export const metadata: Metadata = {
  title: 'Tethered Balloon Monitoring System',
  description:
    'Tethered Balloon Geospatial Intelligence Monitoring System — video analytics, crowd counting, object detection, dan visualisasi geospasial untuk platform aerostat 180 m³.',
  keywords: 'geoint, tethered balloon, aerostat, surveillance, crowd counting, epsilon gimbal',
};

export const viewport: Viewport = {
  themeColor: '#060a13',
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Huruf disajikan dari repositori ini sendiri — dimuat lebih awal
            agar judul tidak berkedip saat pemuatan pertama. */}
        <link rel="preload" href="/fonts/Inter-Latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/SpaceGrotesk-Latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Tema dipulihkan sebelum lukisan pertama supaya tidak ada kedipan
            terang→gelap pada perangkat yang menyimpan preferensi mode terang. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('skystar.theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
