'use client';

import { useState } from 'react';
import { resetPrototypeData, seedChapters } from '@/lib/supabase-data';

export default function AdminDebugPage() {
  const [resetting, setResetting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleReset = async () => {
    setResetting(true);
    const result = await resetPrototypeData();
    showMsg(result.message, result.ok);
    setResetting(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    const result = await seedChapters();
    showMsg(result.message, result.ok);
    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {msg && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-xl ${
          msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Reset Prototype */}
      <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">🗑️ Reset Prototype Data</h3>
            <p className="text-sm text-[#5C7A6E] mt-1">
              Hapus semua chapter, materi, progress, dan nilai — lalu seed ulang data awal.
              Cocok untuk testing atau demo dari awal.
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {resetting ? '⏳' : 'Reset & Seed'}
          </button>
        </div>
      </div>

      {/* Seed Chapters */}
      <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">📚 Seed Ulang Materi</h3>
            <p className="text-sm text-[#5C7A6E] mt-1">
              Hapus semua chapter dan insert ulang dari data awal. Progress & nilai siswa tidak terpengaruh.
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {seeding ? '⏳' : 'Seed Ulang'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">⚠️ Halaman Debug</p>
        <p>Halaman ini hanya muncul saat env <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">NEXT_PUBLIC_IS_DEBUG=true</code>.</p>
        <p className="mt-1">Operasi di sini bersifat destruktif dan langsung memengaruhi database production.</p>
      </div>
    </div>
  );
}
