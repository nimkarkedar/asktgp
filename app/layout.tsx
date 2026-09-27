import type { Metadata, Viewport } from "next";
import { Libre_Baskerville } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";

const baskerville = Libre_Baskerville({
  variable: "--font-baskerville",
  // Variable font (wght 400–700): one file covers regular and semibold.
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf9f6",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://asktgp.com";
const TITLE = "askTGP — Powered by The Gyaan Project";
const DESCRIPTION =
  "Ask anything about design and art. Get answers from The Gyaan Project's 300+ conversations with India's leading designers, artists, and thinkers.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s",
  },
  description: DESCRIPTION,
  applicationName: "askTGP",
  authors: [{ name: "Kedar Nimkar" }],
  creator: "Kedar Nimkar",
  publisher: "The Gyaan Project",
  keywords: [
    "Indian Design Podcast",
    "Art",
    "Design",
    "The Gyaan Project",
    "Creative Wisdom",
    "Kedar Nimkar",
    "askTGP",
    "Indian designers",
    "Indian artists",
    "Design podcast India",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "askTGP",
    url: SITE_URL,
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/open_graph.png",
        width: 1200,
        height: 630,
        alt: "askTGP — Answers from The Gyaan Project",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/open_graph.png"],
  },
  other: {
    "instagram:profile": "https://www.instagram.com/thegyaanprojectpodcast/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/asktgp-favicon.png" />
        <link rel="apple-touch-icon" href="/asktgp-favicon.png" />
        <link rel="me" href="https://www.instagram.com/thegyaanprojectpodcast/" />
      </head>
      <body className={`${baskerville.variable} antialiased flex min-h-dvh flex-col`}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
