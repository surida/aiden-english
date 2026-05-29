import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin dev requests from cloudflared quick tunnels so HMR and
  // /_next dev assets work when testing on a phone over https. Dev-mode only.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
