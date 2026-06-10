'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return setError('Isi username dan password');
    setLoading(true);
    setError('');
    try {
      await signIn(username, password);
      router.push('/');
    } catch {
      setError('Username atau password salah');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8F4] p-4">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#1F3D30]/8 text-[#1F3D30] text-xs font-semibold mb-4 tracking-wide">
            Pendidikan Agama Hindu 🕉️
          </div>
          <div className="flex items-center justify-center gap-3 mb-1">
            <img src="/logo-pasraman.png" alt="Logo Pasraman" className="w-14 h-14 rounded-xl" />
            <h1 className="text-2xl font-extrabold text-[#1F3D30] tracking-tight">
              Pasraman <span className="text-[#C8A84E]">Wira Satya Bhuana</span>
            </h1>
          </div>
          <p className="text-sm text-[#5C7A6E] mt-2">Login dengan akun yang diberikan guru</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(31,61,48,.04),0_8px_40px_rgba(31,61,48,.06)] border border-[#1F3D30]/5">
          {error && (
            <div className="bg-[#ffe8e5] text-[#c0392b] px-4 py-3 rounded-lg text-sm mb-5">
              {error}
            </div>
          )}

          {/* Role toggle */}
          <div className="flex bg-[#f0f4ec] rounded-xl p-1 mb-6">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === 'student'
                  ? 'bg-white text-[#1F3D30] shadow-sm'
                  : 'text-[#5a7d6a]'
              }`}
            >
              🧑‍🎓 Siswa
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === 'teacher'
                  ? 'bg-white text-[#1F3D30] shadow-sm'
                  : 'text-[#5a7d6a]'
              }`}
            >
              👨‍🏫 Guru
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="contoh: siswa001"
                className="w-full px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 pr-11 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-lg text-[#999] hover:text-[#1F3D30]"
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1F3D30] text-[#FBF8F4] rounded-xl text-[15px] font-semibold hover:bg-[#2a5440] transition-colors disabled:opacity-60"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[#8A9E95]">
            Akun dikelola langsung di Supabase oleh guru/admin.
          </p>
        </div>
      </div>
    </div>
  );
}
