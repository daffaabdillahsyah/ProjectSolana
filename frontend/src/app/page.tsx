'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/plinko');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-88px)]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to Plinko...</p>
      </div>
    </div>
  );
}
