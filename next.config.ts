import type { NextConfig } from "next";

const railwayCrmUrl = "https://dumo-crm-production.up.railway.app";

/** Producción en Vercel proxy a Railway CRM. Preview sirve el build de la rama (P1, etc.). */
const isVercelProduction =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";

const crmProxyTarget =
  process.env.CRM_PROXY_TARGET?.replace(/\/$/, "") ??
  (isVercelProduction ? railwayCrmUrl : undefined);

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_REALTIME_URL:
      process.env.NEXT_PUBLIC_REALTIME_URL ??
      (isVercelProduction ? railwayCrmUrl : ""),
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
