import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { Experience } from "@/components/experience";
import TechnikaNavbar from "@/components/Navbar";
import { Footer } from "@/components/footer";
import PageTransition from "@/components/PageTransition";
import { SiteSchema } from "@/components/structured-data";
import {
  absoluteUrl,
  googleSiteVerification,
  indexable,
  siteDescription,
  siteName,
  siteUrl,
  socialImage,
} from "@/lib/seo";
import { HouseProvider } from "@/components/house-provider";
import { RegistrationArrivalProvider } from "@/components/registration-arrival";
import { AuthProvider } from "@/components/auth-provider";
import SmoothScroll from "@/components/SmoothScroll";
import {
  houseAppleIconFor,
  houseBootScript,
  houseIconFor,
  themeAttributeForHouse,
} from "@/lib/houses";
import "lenis/dist/lenis.css";
import "./main.css";

const garamond = localFont({
  src: [
    {
      path: "../../public/fonts/garamond.woff2",
      weight: "400 800",
      style: "normal",
    },
    {
      path: "../../public/fonts/garamond-italic.woff2",
      weight: "400 800",
      style: "italic",
    },
  ],
  variable: "--font-garamond",
  display: "swap",
});
const outfit = localFont({
  src: "../../public/fonts/outfit.woff2",
  variable: "--font-outfit",
  display: "swap",
  weight: "300 700",
});
const handwriting = localFont({
  src: "../../public/fonts/caveat.woff2",
  variable: "--font-handwriting",
  display: "swap",
  weight: "400 700",
});
const harryP = localFont({
  src: "../../public/fonts/HarryP.ttf",
  variable: "--font-harryp",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Technika '27 | BIT Patna Techno-Cultural Festival",
    template: "%s | Technika '27",
  },
  description: siteDescription,
  applicationName: siteName,
  manifest: "/manifest.webmanifest",
  keywords: [
    "Technika 27",
    "Technika 2027",
    "BIT Patna fest",
    "BIT Patna techno-cultural festival",
    "college fest Bihar",
    "tech fest Patna",
    "hackathon Patna",
    "robotics festival Patna",
  ],
  authors: [{ name: "Technika — BIT Patna", url: absoluteUrl("/") }],
  creator: "Technika — BIT Patna",
  publisher: "Birla Institute of Technology, Patna",
  category: "education",
  classification: "Technology and cultural festival",
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
  alternates: { canonical: absoluteUrl("/") },
  robots: {
    index: indexable,
    follow: indexable,
    googleBot: {
      index: indexable,
      follow: indexable,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: { google: googleSiteVerification },
  openGraph: {
    title: "Technika '27 | BIT Patna Techno-Cultural Festival",
    description: siteDescription,
    url: absoluteUrl("/"),
    type: "website",
    locale: "en_IN",
    siteName,
    images: [
      {
        url: absoluteUrl(socialImage),
        width: 1200,
        height: 630,
        alt: "Technika '27 — BIT Patna techno-cultural festival",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Technika '27 | BIT Patna Techno-Cultural Festival",
    description: siteDescription,
    images: [absoluteUrl(socialImage)],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0c19",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Keep the public shell static. The boot script restores the saved house
  // before hydration; authenticated profile data synchronizes client-side.
  const theme = "default" as const;
  const icon = houseIconFor(theme);
  const appleIcon = houseAppleIconFor(theme);

  return (
    <html
      lang="en"
      data-house={theme}
      data-theme={themeAttributeForHouse(theme)}
      className={`${garamond.variable} ${outfit.variable} ${handwriting.variable} ${harryP.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          href={`${icon}?house=${theme}`}
          type={icon.endsWith(".svg") ? "image/svg+xml" : "image/png"}
        />
        <link
          rel="apple-touch-icon"
          href={`${appleIcon}?house=${theme}`}
          type="image/png"
        />
        <Script
          id="restore-house-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: houseBootScript(theme),
          }}
        />
      </head>
      <body className="theme-page transition-colors duration-500">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteSchema />
        <Analytics />
        <HouseProvider initialHouse={theme}>
          <AuthProvider>
            <RegistrationArrivalProvider>
              <SmoothScroll>
                <Experience
                  header={<TechnikaNavbar logoSrc="/images/crest.webp" />}
                  footer={<Footer />}
                >
                  <main id="main-content" tabIndex={-1}>
                    {children}
                    <PageTransition />
                  </main>
                </Experience>
              </SmoothScroll>
            </RegistrationArrivalProvider>
          </AuthProvider>
        </HouseProvider>
      </body>
    </html>
  );
}
