import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the mobile tab bar; build errors still show in the overlay.
  devIndicators: false,
};

export default nextConfig;
