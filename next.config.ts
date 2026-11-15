import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' https://js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "font-src 'self' data:",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [
      {
        source: "/((?!app|api).*)",
        headers: [
          { key: "X-Robots-Tag", value: "index, follow, max-image-preview:large" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        source: "/app/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vintflow.io" }],
        destination: "https://vintflow.io/:path*",
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;