'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Camera, Dumbbell, Home, MoreHorizontal } from 'lucide-react';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/workout', label: 'Workout', icon: Dumbbell },
  { href: '/progress', label: 'Progress', icon: BarChart3 },
  { href: '/photos', label: 'Photos', icon: Camera },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-2 py-3 text-xs ${active ? 'text-white' : 'text-slate-400'}`}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
