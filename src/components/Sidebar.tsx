'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const links: Array<{ href: string; label: string; icon: string; roles?: string[] }> = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/materi', label: 'Materi', icon: '📚' },
  { href: '/tugas', label: 'Tugas', icon: '📝' },
  { href: '/nilai', label: 'Nilai', icon: '📊' },
  { href: '/admin/users', label: 'Admin', icon: '👥', roles: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-[#1F3D30]/5 flex-col z-30">
      <div className="p-6 border-b border-[#1F3D30]/5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/logo-pasraman.png" alt="Logo Pasraman" className="w-10 h-10 rounded-xl" />
          <div>
            <span className="font-bold text-[#1F3D30] text-sm leading-tight block">Pasraman Wira</span>
            <span className="font-bold text-[#C8A84E] text-sm leading-tight">Satya Bhuana</span>
            <p className="text-[11px] text-[#8A9E95]">Pendidikan Hindu</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(l => {
          if (l.roles && !l.roles.includes(role ?? 'student')) return null;
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#1F3D30] text-white shadow-sm'
                  : 'text-[#5C7A6E] hover:bg-[#1F3D30]/5'
              }`}
            >
              <span className="text-lg">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#1F3D30]/5">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full text-left cursor-pointer hover:bg-[#1F3D30]/5 rounded-lg p-2 -m-2 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C8A84E] to-[#E8C84E] flex items-center justify-center text-xs font-bold text-white">
            {(user?.displayName || user?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1F3D30]">
              {user?.displayName || 'Siswa'}
            </p>
            <p className="text-xs text-[#8A9E95]">Keluar</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
