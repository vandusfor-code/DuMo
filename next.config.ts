import type { NextConfig } from "next";

const railwayCrmUrl = "https://dumo-crm-production.up.railway.app";

const crmProxyTarget =
  process.env.CRM_PROXY_TARGET?.replace(/\/$/, "") ??
  (process.env.VERCEL === "1" ? railwayCrmUrl : undefined);

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_REALTIME_URL:
      process.env.NEXT_PUBLIC_REALTIME_URL ??
      (process.env.VERCEL === "1" ? railwayCrmUrl : ""),
  },
  async rewrites() {
    if (!crmProxyTarget) return [];
    return {
      beforeFiles: [
        {
          source: "/:path*",
          destination: `${crmProxyTarget}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
