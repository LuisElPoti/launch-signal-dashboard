import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Launch Signal Dashboard',
  description: 'Track startup launches, funding signals, social traction, and AI-generated outreach opportunities.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Script
          id="strip-extension-hydration-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const ATTRS = ['fdprocessedid'];
                const clean = (root = document) => {
                  for (const attr of ATTRS) {
                    root.querySelectorAll?.('[' + attr + ']').forEach((node) => node.removeAttribute(attr));
                  }
                };
                clean();
                const observer = new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && ATTRS.includes(mutation.attributeName || '')) {
                      mutation.target.removeAttribute(mutation.attributeName);
                    }
                    mutation.addedNodes.forEach((node) => {
                      if (node.nodeType === 1) clean(node);
                    });
                  }
                });
                observer.observe(document.documentElement, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: ATTRS,
                });
                window.addEventListener('load', () => setTimeout(() => observer.disconnect(), 3000), { once: true });
              })();
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
