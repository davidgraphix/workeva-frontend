import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // The web app renders HTML and talks to the API; it stores no secrets of its
  // own. These headers are the browser-side half of the policy documented in
  // the backend's docs/security.md.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // Geolocation is the one capability this app genuinely needs, and
            // only for attendance.
            value: "geolocation=(self), camera=(), microphone=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
