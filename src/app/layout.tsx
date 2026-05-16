import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'LRE Onboarding',
  description: 'New agent onboarding portal for LRE Realty',
  applicationName: 'LRE Onboarding',
  appleWebApp: {
    capable: true,
    title: 'LRE Onboarding',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#030712',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-gray-950">
      <body className="font-sans bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  )
}
