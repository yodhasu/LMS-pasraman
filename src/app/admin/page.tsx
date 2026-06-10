'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && role !== 'admin') router.push('/dashboard');
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  if (role !== 'admin') return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Link
        href="/admin/users"
        className="bg-white rounded-2xl border border-[#1F3D30]/5 p-6 hover:shadow-md transition-shadow"
      >
        <div className="text-3xl mb-3">👥</div>
        <h3 className="font-bold text-lg">User Management</h3>
        <p className="text-sm text-[#5C7A6E] mt-1">Tambah, edit, reset password, dan hapus akun</p>
      </Link>
      <Link
        href="/admin/kelas"
        className="bg-white rounded-2xl border border-[#1F3D30]/5 p-6 hover:shadow-md transition-shadow"
      >
        <div className="text-3xl mb-3">🏫</div>
        <h3 className="font-bold text-lg">Kelola Kelas</h3>
        <p className="text-sm text-[#5C7A6E] mt-1">Buat, edit, hapus kelas, dan atur siswa di dalamnya</p>
      </Link>
    </div>
  );
}
