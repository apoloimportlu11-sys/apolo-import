import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Montserrat, Inter, Roboto, Oswald } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import ConsentAnalytics from '@/components/ConsentAnalytics'
import CookieConsent from '@/components/CookieConsent'
import { BusinessSettingsProvider } from '@/lib/realtime-context'
import { Toaster } from '@/components/ui/sonner'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import { QuoteProvider } from '@/lib/quote-context'
import QuoteDrawer from '@/components/QuoteDrawer'
import FloatingQuoteButton from '@/components/FloatingQuoteButton'
import ImageProtection from '@/components/ImageProtection'
import FestiveEffects from '@/components/FestiveEffects'
import { SmoothScroll } from '@/components/smooth-scroll'
import { JsonLd } from '@/components/JsonLd'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const siteUrl = getSiteUrl()
const siteName = 'Apolo Lubricantes'
const siteTitle = 'Apolo Lubricantes | Aceites y Lubricantes para Vehículos'
const siteDescription =
  'Distribuidor de aceites de motor, lubricantes y fluidos para motos, autos, camiones y vehículos pesados. Cotiza Apolo, Overts y más.'

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: '--font-montserrat',
  display: 'swap',
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: '--font-roboto',
  display: 'swap',
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--font-oswald',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0E0E0E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'lubricantes',
    'aceites de motor',
    'Apolo Lubricantes',
    'Overts',
    'motos',
    'autos',
    'camiones',
    'grasas',
    'refrigerantes',
    'cotización lubricantes',
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/images/logoApolo.png',
        width: 512,
        height: 512,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/images/logoApolo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`dark ${montserrat.variable} ${inter.variable} ${roboto.variable} ${oswald.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <Script id="apolo-theme" strategy="beforeInteractive">
          {`(function(){try{var p=location.pathname;if(p==="/admin"||p.indexOf("/admin/")===0)return;var t=localStorage.getItem("apolo-theme")||"dark";var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(dark?"dark":"light");document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`}
        </Script>
        <Script id="apolo-admin-theme" strategy="beforeInteractive">
          {`(function(){try{var p=location.pathname;if(!(p==="/admin"||p.indexOf("/admin/")===0))return;var t=localStorage.getItem("apolo-admin-theme")||"light";var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.remove("admin-tone-light","admin-tone-dark");document.documentElement.classList.add(dark?"admin-tone-dark":"admin-tone-light");document.documentElement.setAttribute("data-admin-theme",t);document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${inter.className} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: siteName,
            url: siteUrl,
            logo: `${siteUrl}/images/logoApolo.png`,
            email: 'apoloimportlu11@gmail.com',
            telephone: '+51958400028',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Las Flores SJL',
              addressLocality: 'Lima',
              addressCountry: 'PE',
            },
            sameAs: [
              'https://www.facebook.com/profile.php?id=61587515016695',
            ],
          }}
        />
        <ThemeProvider defaultTheme="dark" enableSystem={false}>
          <ImageProtection />
          <FestiveEffects />
          <BusinessSettingsProvider>
            <QuoteProvider>
              <SmoothScroll />
              {children}
              <FloatingWhatsApp />
              <FloatingQuoteButton />
              <QuoteDrawer />
              <CookieConsent />
              <Toaster position="top-right" richColors />
            </QuoteProvider>
          </BusinessSettingsProvider>
          <ConsentAnalytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
