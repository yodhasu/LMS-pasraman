'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const tabs: Array<{ href: string; label: string; icon: string; roles?: string[] }> = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['student', 'teacher'] },
  { href: '/materi', label: 'Materi', icon: '📚', roles: ['student', 'teacher'] },
  { href: '/tugas', label: 'Tugas', icon: '📝', roles: ['student', 'teacher'] },
  { href: '/nilai', label: 'Nilai', icon: '📊', roles: ['student', 'teacher'] },
  { href: '/admin', label: 'Admin Panel', icon: '⚙️', roles: ['admin'] },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { role, logout } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#1F3D30]/10 z-40 safe-bottom">
      <div className="flex justify-around items-center h-16">
        {tabs.map(t => {
          if (t.roles && !t.roles.includes(role ?? 'student')) return null;
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 transition-colors ${
                active ? 'text-[#1F3D30]' : 'text-[#8A9E95]'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className={`text-[11px] font-medium ${active ? 'font-semibold' : ''}`}>{t.label}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 text-[#DC2626] transition-colors cursor-pointer"
        >
          <span className="text-xl">🚪</span>
          <span className="text-[11px] font-medium">Keluar</span>
        </button>
      </div>
    </nav>
  );
}
