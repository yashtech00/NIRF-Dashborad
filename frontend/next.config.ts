import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Route Handlers in app/api/nirf/* proxy to the backend server-side.
  // No rewrites needed — server-to-server fetch bypasses SSRF protection.
};

export default nextConfig;
