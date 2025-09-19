'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="flex justify-between items-center p-6 border-b border-gray-800">
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center">
          <span className="text-black font-bold text-sm">🍀</span>
        </div>
        <h1 className="text-xl font-bold">LUCK.IO</h1>
      </div>
      <nav className="flex gap-4">
        <Link 
          href="/plinko" 
          className={pathname.startsWith('/plinko') ? 'text-lime-400' : 'text-zinc-300 hover:text-white transition-colors'}
        >
          Plinko
        </Link>
        <Link 
          href="/crash" 
          className={pathname.startsWith('/crash') ? 'text-lime-400' : 'text-zinc-300 hover:text-white transition-colors'}
        >
          Crash
        </Link>
      </nav>
    </header>
  );
}
