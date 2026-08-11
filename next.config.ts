import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    localPatterns: [
      { pathname: "/uploads/**" },
      { pathname: "/brand/**" },
    ],
  },
};

export default nextConfig;
