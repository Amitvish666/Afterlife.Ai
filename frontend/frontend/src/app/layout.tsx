import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hqtalsezrmvfjtlgjrhj.supabase.co'),
  title: {
    default: 'Beyond Life AI - Preserve Memories, Connect Forever',
    template: '%s | Beyond Life AI',
  },
  description: 'Create AI-powered digital personas from your loved ones\' memories, conversations, and media. Experience meaningful connections that transcend time.',
  keywords: ['AI', 'persona', 'memory', 'digital immortality', 'voice cloning', 'avatar', 'chatbot', 'preservation'],
  authors: [{ name: 'CODEXION' }],
  creator: 'CODEXION',
  publisher: 'CODEXION',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://beyondlife.ai',
    siteName: 'Beyond Life AI',
    title: 'Beyond Life AI - Preserve Memories, Connect Forever',
    description: 'Create AI-powered digital personas from your loved ones\' memories, conversations, and media.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Beyond Life AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beyond Life AI - Preserve Memories',
    description: 'Create AI-powered digital personas from your loved ones\' memories',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
