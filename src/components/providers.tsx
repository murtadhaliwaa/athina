"use client";

import { DirectionProvider } from "@radix-ui/react-direction";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark">
      <DirectionProvider dir="rtl">
        {children}
        <Toaster richColors position="top-center" />
      </DirectionProvider>
    </ThemeProvider>
  );
}
