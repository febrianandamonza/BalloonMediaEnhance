import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },

  /* config options here */
};
// next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: '/output/:path*', destination: 'http://127.0.0.1:8000/output/:path*' },
    ];
  },
};

export default nextConfig;
