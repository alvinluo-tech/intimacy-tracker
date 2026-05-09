import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Script from "next/script";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "Encounter",
  description: "Private, consent-first intimacy tracker",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Encounter",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
        <body className="min-h-full flex flex-col bg-app text-app">
          <ThemeProvider>
            <Suspense>
              <IntlProvider>{children}</IntlProvider>
            </Suspense>
            <Toaster
              position="top-right"
              duration={2000}
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "var(--app-panel)",
                  border: "1px solid var(--app-border)",
                  color: "var(--app-text)",
                },
              }}
            />
          </ThemeProvider>
        {/* iOS splash screens */}
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash-2556.png"
              media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <meta name="format-detection" content="telephone=no" />
        <Script
          id="service-worker-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // ---- PWA: capture beforeinstallprompt ASAP ----
              window.__pwa = { prompt: null, platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop' };
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwa.prompt = e;
                window.dispatchEvent(new CustomEvent('pwa-installable'));
              });
              window.addEventListener('appinstalled', function() {
                window.__pwa.prompt = null;
                window.dispatchEvent(new CustomEvent('pwa-installed'));
              });

              // ---- Service Worker ----
              if ('serviceWorker' in navigator) {
                let swRegistration = null;

                function notifyUpdate(reg) {
                  window.dispatchEvent(new CustomEvent('pwa-update-found', { detail: reg }));
                }

                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg) {
                    swRegistration = reg;
                    console.log('[PWA] SW registered:', reg.scope);

                    if (reg.waiting) {
                      notifyUpdate(reg);
                    }

                    reg.addEventListener('updatefound', function() {
                      var newWorker = reg.installing;
                      if (!newWorker) return;
                      newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          console.log('[PWA] Update ready');
                          notifyUpdate(reg);
                        }
                      });
                    });
                  }).catch(function(err) { console.log('[PWA] SW registration failed:', err); });

                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (refreshing) return;
                    refreshing = true;
                    console.log('[PWA] New SW activated, reloading');
                    window.location.reload();
                  });
                });

                setInterval(function() {
                  if (swRegistration) {
                    swRegistration.update().catch(function() {});
                  }
                }, 60 * 60 * 1000);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

async function IntlProvider({ children }: { children: React.ReactNode }) {
  const { getLocale, getMessages } = await import("next-intl/server");
  const { NextIntlClientProvider } = await import("next-intl");

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div lang={locale}>{children}</div>
    </NextIntlClientProvider>
  );
}
