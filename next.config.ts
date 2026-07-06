import type { NextConfig } from "next";

// Allowed origins for CORS on /api/auth/* routes
const STATIC_AUTH_ORIGINS: string[] = [
  `http://localhost:${process.env.PORT || '3000'}`,
  `http://127.0.0.1:${process.env.PORT || '3000'}`,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_SSO_DASHBOARD_URL,
  process.env.PORTAL_URL,
  process.env.NEXT_PUBLIC_PORTAL_URL,
  "https://hub.richz.id",
  "https://hub-dev.richz.id",
  "https://portal.expressa.id",
  "https://portal-dev.expressa.id",
  "http://192.168.1.6:3000",
  "http://192.168.10.159:3000",
];

const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const AUTH_ALLOWED_ORIGINS: string[] = [...STATIC_AUTH_ORIGINS, ...envOrigins].filter(Boolean) as string[];

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Skip type checking during build (for faster builds with type errors)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Allow Server Actions from SSO origins
  experimental: {
    serverActions: {
      allowedOrigins: [
        `localhost:${process.env.PORT || '3000'}`,
        `127.0.0.1:${process.env.PORT || '3000'}`,
        ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL.replace('http://', '').replace('https://', '')] : []),
        ...(process.env.NEXT_PUBLIC_SSO_DASHBOARD_URL ? [process.env.NEXT_PUBLIC_SSO_DASHBOARD_URL.replace('http://', '').replace('https://', '')] : []),
        "hub.richz.id",
        "hub-dev.richz.id",
        "portal.expressa.id",
        "portal-dev.expressa.id",
      ]
    }
  },
  async headers() {
    return [
      {
        // Allow CORS for SSO callback routes from allowed origins
        source: "/api/auth/(.*)",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
        ],
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
