import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Epstein Exposed | Public Investigation Platform",
  description: "The definitive cross-referenced database of 11,622 DOJ documents, flight logs, and the infamous Black Book. AI-powered analysis with source citations.",
  keywords: ["Epstein", "investigation", "DOJ documents", "flight logs", "Black Book", "AI analysis", "public records"],
  authors: [{ name: "The Legendary Dankster A.I. Algorithm" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Epstein Exposed | Public Investigation Platform",
    description: "Cross-referenced investigation of 11,622 DOJ documents + unredacted sources. CTRL+Click entities to analyze connections.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Epstein Exposed - Public Investigation Platform",
      },
    ],
    type: "website",
    siteName: "Epstein Exposed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Epstein Exposed",
    description: "The definitive public investigation platform - 11,622 documents cross-referenced with flight logs & Black Book",
    images: [
      {
        url: "/twitter-image.png",
        width: 1200,
        height: 600,
        alt: "Epstein Exposed",
      },
    ],
    creator: "@danksterintel",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://lyzpmfvujegnbsdptypz.supabase.co" />
        <link rel="dns-prefetch" href="https://lyzpmfvujegnbsdptypz.supabase.co" />
        <link rel="preconnect" href="https://openrouter.ai" />
        {/* Preload critical fonts */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
