import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Workeva",
    template: "%s · Workeva",
  },
  description:
    "Workeva gives businesses one place to manage their people, attendance, leave and everyday work.",
  applicationName: "Workeva",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewportFit lets the clock-in button clear a phone's home indicator.
  viewportFit: "cover",
  themeColor: "#0B1220",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
