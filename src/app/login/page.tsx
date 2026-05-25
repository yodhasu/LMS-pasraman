'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
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
      router.push('/dashboard');
    } catch {
      setError('Username atau password salah');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch {
      setError('Gagal login dengan Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8F4] p-4">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#1F3D30]/8 text-[#1F3D30] text-xs font-semibold mb-4 tracking-wide">
            Pendidikan Agama Hindu
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8A84E] to-[#E8C84E] flex items-center justify-center text-white text-lg">🕉️</div>
            <h1 className="text-2xl font-extrabold text-[#1F3D30] tracking-tight">
              LMS <span className="text-[#C8A84E]">Pasraman</span>
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

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#d4dcd0]" />
            <span className="text-xs text-[#999]">atau</span>
            <div className="flex-1 h-px bg-[#d4dcd0]" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full py-3.5 bg-white border border-[#d4dcd0] rounded-xl text-[15px] font-semibold hover:bg-[#f5f5f5] transition-colors flex items-center justify-center gap-2.5 text-[#333]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>
      </div>
    </div>
  );
}
