import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LRE Onboarding',
  description: 'New agent onboarding portal for LRE Realty',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-gray-950">
      <body className="font-sans bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  )
}
