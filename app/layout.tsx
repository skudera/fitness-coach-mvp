import './globals.css'
import type { Metadata, Viewport } from 'next'
import { BottomNav } from '@/components/BottomNav'
import { AuthGate } from '@/components/AuthGate'

export const metadata: Metadata = {
  title: 'Fitness Coach',
  description: 'Personal adaptive fitness coach',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Fitness Coach',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020617',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <main className="mx-auto min-h-screen max-w-md px-4 pb-24 pt-5">
            {children}
          </main>
          <BottomNav />
        </AuthGate>
      </body>
    </html>
  )
}
