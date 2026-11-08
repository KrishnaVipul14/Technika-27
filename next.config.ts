import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [{
      source: "/:path*.(woff2|webp|png|jpg|jpeg|svg|mp4)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", statusCode: 301 },
      { source: "/contact-us", destination: "/contact", statusCode: 301 },
      { source: "/register", destination: "/registrations", statusCode: 301 },
      { source: "/team", destination: "/members", statusCode: 301 },
      { source: "/events/:path+", destination: "/events", statusCode: 301 },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
  },
  experimental: { cpus: 2, webpackMemoryOptimizations: true, agentUpgrade: "security" },
};

export default nextConfig;
