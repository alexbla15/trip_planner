import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) for Docker
  // deployment (Render/Railway/Fly) — Vercel ignores this and uses its own build output.
  output: "standalone",
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
