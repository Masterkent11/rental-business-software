import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["echarts", "zrender"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
