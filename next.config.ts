import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The questions wall on the homepage replaces the Explore page (PRD §5.4).
    return [{ source: "/explore", destination: "/", permanent: true }];
  },
};

export default nextConfig;
