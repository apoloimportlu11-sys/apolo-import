import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Montserrat, Inter, Roboto } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { BusinessSettingsProvider } from '@/lib/realtime-context'
import { Toaster } from '@/components/ui/sonner'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import { QuoteProvider } from '@/lib/quote-context'
import QuoteDrawer from '@/components/QuoteDrawer'
import FloatingQuoteButton from '@/components/FloatingQuoteButton'
import ImageProtection from '@/components/ImageProtection'
import FestiveEffects from '@/components/FestiveEffects'
import './globals.css'

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

export const viewport: Viewport = {
  themeColor: '#0E0E0E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Apolo Lubricantes | Aceites y Lubricantes para Vehículos',
  description: 'Apolo Lubricantes - Distribuidor de aceites de motor, lubricantes y fluidos para motos, autos, camiones y vehículos pesados. Calidad y rendimiento garantizado.',
  keywords: ['lubricantes', 'aceites de motor', 'motos', 'autos', 'camiones', 'grasas', 'refrigerantes'],
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
    <html lang="es" className={`dark ${montserrat.variable} ${inter.variable} ${roboto.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <Script id="apolo-admin-theme" strategy="beforeInteractive">
          {`(function(){try{var p=location.pathname;if(!(p==="/admin"||p.indexOf("/admin/")===0))return;var t=localStorage.getItem("apolo-admin-theme")||"light";var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.remove("admin-tone-light","admin-tone-dark");document.documentElement.classList.add(dark?"admin-tone-dark":"admin-tone-light");document.documentElement.setAttribute("data-admin-theme",t);document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${inter.className} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="dark" enableSystem={false}>
          <ImageProtection />
          <FestiveEffects />
          <BusinessSettingsProvider>
            <QuoteProvider>
              {children}
              <FloatingWhatsApp />
              <FloatingQuoteButton />
              <QuoteDrawer />
              <Toaster position="top-right" richColors />
            </QuoteProvider>
          </BusinessSettingsProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
