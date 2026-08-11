import type { Metadata, Viewport } from "next";
import { Outfit, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "luxfabric",
    template: "%s · luxfabric",
  },
  description: "luxfabric — premium tekstil.",
  applicationName: "luxfabric",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/luxfabric-mark.svg",
    apple: "/brand/luxfabric-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "luxfabric",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={`${outfit.variable} ${syne.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
