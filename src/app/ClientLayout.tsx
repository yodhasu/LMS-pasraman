'use client';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Single redirect effect — all routing decisions in one place, no ping-pong
  useEffect(() => {
    if (loading) return;

    // Logged in user on login page → go to dashboard
    if (user && pathname === '/login') {
      router.replace('/dashboard');
      return;
    }

    // No user on protected page → go to login
    if (!user && pathname !== '/login') {
      router.replace('/login');
      return;
    }
  }, [user, loading, pathname, router]);

  // Show spinner only during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F4]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  // Fallback while redirect is in progress
  if (!user && pathname !== '/login') return null;
  if (user && pathname === '/login') return null;

  // Login page — render without sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Protected pages
  return (
    <>
      <Sidebar />
      <div className="lg:ml-64 pb-20 lg:pb-0">
        <main className="p-4 lg:p-8 min-h-screen">{children}</main>
      </div>
      <BottomNav />
    </>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
