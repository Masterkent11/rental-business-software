import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Remote placeholder photography until Step 5 defines a media pipeline.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  /* config options here */
};

export default nextConfig;
