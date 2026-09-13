import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/admin/main",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
