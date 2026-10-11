import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Fredoka, Nunito } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { PwaUpdater } from "@/components/app/pwa-updater";
import "katex/dist/katex.min.css";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Handwriting face for note content, on screen and in the PDF. A variable
// weight range keeps headings bold and body legible.
const caveat = Caveat({
  variable: "--font-hand-src",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

// Editorial serif for the premium note reading view — titles, headings, drop
// caps. Fraunces has a high-contrast, magazine feel with a true italic.
const fraunces = Fraunces({
  variable: "--font-serif-src",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumi: lecture recordings into beautiful notes",
  description:
    "Record your lectures and get clean, well-organised study notes with diagrams, summaries and PDF export. Free for every CUST student.",
  applicationName: "Lumi",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Lumi",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#17141f" },
  ],
};

// Set the saved theme before paint so there is no flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem("lumi-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${fredoka.variable} ${nunito.variable} ${caveat.variable} ${fraunces.variable} ${GeistMono.variable} h-full`}
    >
      <body className="paper-grain min-h-full flex flex-col">
        <Script
          id="lumi-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {children}
        <PwaUpdater />
      </body>
    </html>
  );
}
