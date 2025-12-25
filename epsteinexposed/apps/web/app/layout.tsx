import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Base URL for canonical links
const BASE_URL = "https://epsteinexposed.netlify.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#0a0a0f" },
  ],
};

export const metadata: Metadata = {
  // Core metadata
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Epstein Exposed | 11,622 DOJ Documents Cross-Referenced",
    template: "%s | Epstein Exposed",
  },
  description: "The definitive public investigation platform. 11,622 DOJ documents, flight logs, and the Black Book cross-referenced with AI-powered analysis. Expose the truth with verifiable sources.",
  keywords: [
    "Jeffrey Epstein", "Epstein documents", "DOJ documents", "Epstein flight logs", 
    "Lolita Express", "Black Book", "Ghislaine Maxwell", "Epstein investigation",
    "public records", "FOIA documents", "Epstein network", "Epstein connections",
    "court documents", "unsealed documents", "Epstein case", "Epstein files",
    "document database", "AI investigation", "cross-reference", "entity connections"
  ],
  authors: [{ name: "Epstein Exposed Investigation Team", url: BASE_URL }],
  creator: "AirGapped Intelligence Systems",
  publisher: "Epstein Exposed",
  
  // Canonical URL
  alternates: {
    canonical: BASE_URL,
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180" },
    ],
    shortcut: "/favicon.ico",
  },
  
  // Manifest for PWA
  manifest: "/manifest.json",
  
  // Open Graph - Facebook, LinkedIn, Discord
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Epstein Exposed",
    title: "Epstein Exposed | 11,622 DOJ Documents Cross-Referenced",
    description: "The definitive public investigation platform. Cross-reference 11,622 DOJ documents with flight logs & the Black Book. AI-powered analysis with source citations.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Epstein Exposed - Public Investigation Platform - 11,622 Documents",
        type: "image/png",
      },
      {
        url: `${BASE_URL}/og-image-square.png`,
        width: 1200,
        height: 1200,
        alt: "Epstein Exposed",
        type: "image/png",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@danksterintel",
    creator: "@danksterintel",
    title: "Epstein Exposed | 11,622 DOJ Documents",
    description: "Cross-reference 11,622 DOJ documents with flight logs & Black Book. AI-powered investigation with source citations. The truth is in the documents.",
    images: {
      url: `${BASE_URL}/twitter-image.png`,
      alt: "Epstein Exposed - Public Investigation Platform",
    },
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verification (add your actual verification codes)
  verification: {
    google: "your-google-verification-code", // Replace with actual
    // yandex: "your-yandex-code",
    // bing: "your-bing-code",
  },
  
  // App links
  appLinks: {
    web: {
      url: BASE_URL,
      should_fallback: true,
    },
  },
  
  // Category
  category: "investigation",
  
  // Classification
  classification: "Public Records Investigation Platform",
  
  // Other metadata
  other: {
    "msapplication-TileColor": "#0a0a0f",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",
  },
};

// JSON-LD Structured Data for Rich Search Results
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    // Website Schema
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "url": BASE_URL,
      "name": "Epstein Exposed",
      "description": "The definitive public investigation platform for Jeffrey Epstein case documents",
      "publisher": { "@id": `${BASE_URL}/#organization` },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${BASE_URL}/?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
      "inLanguage": "en-US"
    },
    // Organization Schema
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      "name": "Epstein Exposed",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/logo.png`,
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://twitter.com/danksterintel"
      ],
      "description": "Public investigation platform dedicated to transparency and accountability"
    },
    // Dataset Schema - Critical for appearing in Google Dataset Search
    {
      "@type": "Dataset",
      "name": "Epstein DOJ Documents Database",
      "description": "Cross-referenced database of 11,622 Department of Justice documents related to the Jeffrey Epstein case, including court filings, depositions, and evidence exhibits.",
      "url": BASE_URL,
      "identifier": "epstein-doj-documents-2024",
      "keywords": [
        "Jeffrey Epstein",
        "DOJ documents",
        "court records",
        "public records",
        "FOIA",
        "Ghislaine Maxwell",
        "flight logs",
        "Black Book"
      ],
      "license": "https://creativecommons.org/publicdomain/zero/1.0/",
      "isAccessibleForFree": true,
      "creator": {
        "@type": "Organization",
        "name": "Epstein Exposed"
      },
      "distribution": {
        "@type": "DataDownload",
        "encodingFormat": "application/pdf",
        "contentUrl": BASE_URL
      },
      "temporalCoverage": "2006/2024",
      "spatialCoverage": {
        "@type": "Place",
        "name": "United States"
      },
      "measurementTechnique": "AI-powered entity extraction and cross-referencing",
      "variableMeasured": [
        {
          "@type": "PropertyValue",
          "name": "Documents",
          "value": "11,622"
        },
        {
          "@type": "PropertyValue",
          "name": "Entities",
          "value": "50,000+"
        },
        {
          "@type": "PropertyValue",
          "name": "Connections",
          "value": "1,300,000+"
        }
      ]
    },
    // WebApplication Schema
    {
      "@type": "WebApplication",
      "name": "Epstein Exposed Investigation Platform",
      "url": BASE_URL,
      "applicationCategory": "InvestigationApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "3D Entity Network Visualization",
        "AI-Powered Document Analysis",
        "Cross-Reference Search",
        "Document Viewer with Citations",
        "Connection Strength Analysis"
      ],
      "screenshot": `${BASE_URL}/og-image.png`
    },
    // FAQPage Schema - Helps with featured snippets
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Epstein Exposed?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Epstein Exposed is a public investigation platform that cross-references 11,622 DOJ documents with flight logs and the Black Book. It uses AI-powered analysis to help researchers explore connections between entities mentioned in the Jeffrey Epstein case."
          }
        },
        {
          "@type": "Question",
          "name": "How many documents are in the Epstein database?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The database contains 11,622 Department of Justice documents, including court filings, depositions, exhibits, and unsealed records from various cases related to Jeffrey Epstein and Ghislaine Maxwell."
          }
        },
        {
          "@type": "Question",
          "name": "Is Epstein Exposed free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Epstein Exposed is completely free and open to the public. All documents are from public records and FOIA releases."
          }
        },
        {
          "@type": "Question",
          "name": "What is the Epstein flight log?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The Epstein flight logs are records of passengers who flew on Jeffrey Epstein's private aircraft, including the Boeing 727 known as the 'Lolita Express'. These logs have been cross-referenced with other documents in our database."
          }
        },
        {
          "@type": "Question",
          "name": "What is Epstein's Black Book?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Epstein's Black Book is a contact directory that contained names, phone numbers, and addresses of individuals associated with Jeffrey Epstein. It was leaked and has been cross-referenced with DOJ documents in our platform."
          }
        }
      ]
    },
    // BreadcrumbList for navigation
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": BASE_URL
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Investigation",
          "item": `${BASE_URL}/#investigate`
        }
      ]
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
