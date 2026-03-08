import './globals.css';
import type { Metadata } from 'next';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Fitness Coach MVP',
  description: 'Personal adaptive fitness coach MVP scaffold',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto min-h-screen max-w-md px-4 pb-24 pt-5">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
