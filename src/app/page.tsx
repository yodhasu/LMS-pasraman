'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    // role is null while ensureAppUser is still fetching — wait for it
    if (role === null) return;
    if (role === 'admin') router.replace('/admin');
    else router.replace('/dashboard');
  }, [user, role, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8F4]">
      <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
    </div>
  );
}
