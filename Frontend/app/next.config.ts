import path from "node:path";
import type { NextConfig } from "next";

process.env.TZ = 'Asia/Jakarta';

const nextConfig: NextConfig = {
  /* Repositori ini memuat lockfile pada root maupun pada app/. Menetapkan
     root secara eksplisit menghentikan penyimpulan otomatis Turbopack yang
     dapat memilih direktori keliru saat proses build. */
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
