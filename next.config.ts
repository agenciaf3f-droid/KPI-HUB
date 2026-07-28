import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Keep the two workspace views warm between quick tab switches. Realtime
    // updates still refresh the current route as soon as an operation changes.
    staleTimes: {
      dynamic: 15,
      static: 180,
    },
  },
};

export default nextConfig;
