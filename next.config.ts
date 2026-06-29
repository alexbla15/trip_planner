import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Allow any https host so users can paste arbitrary cover image URLs
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
