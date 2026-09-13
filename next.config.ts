import type { NextConfig } from "next";
import { withEve } from "eve/next";

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

export default withEve(nextConfig);
