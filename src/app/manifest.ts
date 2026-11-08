import type { MetadataRoute } from "next";
import { t } from "@/lib/i18n/ar-iq";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t("app.name"),
    short_name: t("app.shortName"),
    start_url: "/",
    display: "standalone",
    orientation: "any",
    lang: "ar",
    dir: "rtl",
    background_color: "#F1EBE0",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
