import { Geist, Geist_Mono, Lora } from "next/font/google";

import "@call/ui/globals.css";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/lib/site";
import { Metadata } from "next";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontLora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: ` %s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  keywords: [
    "Call",
    "Call0",
    "Call0.co",
    "Call0.com",
    "Call0.net",
    "Call0.org",
    "Call0.io",
    "Open source",
    "Zoom",
    "Google Meet",
    "AI-Native",
    "AI-Native alternative",
    "AI-Native alternative to Zoom",
    "AI-Native alternative to Google Meet",
  ],
  creator: siteConfig.links.author,
  authors: [
    {
      name: siteConfig.links.author,
      url: siteConfig.links.authorSite,
    },
  ],
  icons: {
    icon: [
      { url: "/call-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/call-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.links.x,
  },
  manifest: `${siteConfig.url}/site.webmanifest`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <script src="https://cdn.peasy.so/peasy.js" data-website-id="01jybpzkjn3xgyfj6x4dq51ftt" async></script>
      <body
        className={`${fontSans.variable} ${fontLora.variable} ${fontMono.variable} font-sans antialiased transition-all duration-300`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
