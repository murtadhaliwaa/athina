import type { NextConfig } from "next";

function supabaseImageHost(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  try {
    if (!raw) return null;
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const imageHost = supabaseImageHost();

const nextConfig: NextConfig = {
  // تطبيق مصادقة بالجلسات/الكوكيز — نتجنب Cache Components حتى لا تتعارض مع cookies()
  // السماح بالتجربة من الجوال على شبكة LAN أثناء التطوير
  allowedDevOrigins: ["192.168.31.130", "127.0.0.1", "localhost"],
  images: {
    qualities: [55, 75],
    remotePatterns: imageHost
      ? [
          {
            protocol: "https",
            hostname: imageHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
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
