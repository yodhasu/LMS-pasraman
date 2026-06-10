'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const adminTabs = [
  { href: '/admin/users', label: 'User Management', icon: '👥' },
  { href: '/admin/kelas', label: 'Kelola Kelas', icon: '🏫' },
];

const isDebug = process.env.NEXT_PUBLIC_IS_DEBUG === 'true';

if (isDebug) {
  adminTabs.push({ href: '/admin/debug', label: 'Debug', icon: '🔧' });
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && role !== 'admin') router.push('/dashboard');
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  if (role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Admin Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[#1F3D30]">⚙️ Admin Panel</h1>
        <p className="text-sm text-[#5C7A6E] mt-0.5">Kelola pengguna dan kelas</p>
      </div>

      {/* Sub-navigation tabs */}
      <nav className="flex gap-1 bg-[#FBF8F4] rounded-xl p-1 border border-[#1F3D30]/5">
        {adminTabs.map(t => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? 'bg-white text-[#1F3D30] shadow-sm'
                  : 'text-[#5C7A6E] hover:text-[#1F3D30] hover:bg-white/50'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Page content */}
      {children}
    </div>
  );
}
