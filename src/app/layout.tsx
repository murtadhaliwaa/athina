import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import { Providers } from "@/components/providers";
import { t } from "@/lib/i18n/ar-iq";
import "./globals.css";

const font = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.description"),
  applicationName: t("app.shortName"),
  appleWebApp: {
    capable: true,
    title: t("app.shortName"),
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1EBE0" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${font.variable} dark h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className={`${font.className} min-h-full flex flex-col bg-background text-foreground`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,c=d.classList;c.remove('light','dark');var t=localStorage.getItem('theme');var dark=t!=='light';c.add(dark?'dark':'light');d.style.colorScheme=dark?'dark':'light';d.style.backgroundColor=dark?'#0a0a0a':'#f1ebe0';}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.backgroundColor='#0a0a0a'}})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
