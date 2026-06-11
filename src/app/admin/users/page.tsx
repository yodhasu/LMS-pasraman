'use client';

import { useAuth } from '@/lib/AuthContext';
import {
  useAllUsers, adminCreateUser, adminUpdateUser,
  adminDeleteUser, adminResetPassword, adminSetPassword,
} from '@/lib/supabase-data';
import { useState, useMemo } from 'react';

type RoleFilter = 'all' | 'student' | 'teacher' | 'admin';

const ROLE_BADGES: Record<string, { label: string; bg: string }> = {
  student: { label: '🎒 Siswa', bg: 'bg-blue-50 text-blue-700' },
  teacher: { label: '👨🏫 Guru', bg: 'bg-emerald-50 text-emerald-700' },
  admin:   { label: '⚙️ Admin', bg: 'bg-purple-50 text-purple-700' },
};

const ITEMS_PER_PAGE = 15;

// ── Shared Modal wrapper ──
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#E8E4DD]/60">
          <h2 className="font-bold text-lg text-[#1F3D30]">{title}</h2>
          <button onClick={onClose} className="text-[#5C7A6E] hover:text-[#1F3D30] text-xl leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Create / Edit User Form ──
function UserForm({ mode, initial, onSave, onClose }: {
  mode: 'create' | 'edit';
  initial?: { id: string; username: string; displayName: string; role: string };
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(initial?.username ?? '');
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [role, setRole] = useState<string>(initial?.role ?? 'student');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('Username wajib diisi.'); return; }
    if (!displayName.trim()) { setError('Nama wajib diisi.'); return; }
    setSaving(true); setError(null);
    await onSave({
      id: initial?.id,
      username: username.trim(),
      displayName: displayName.trim(),
      role,
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</div>}

      <div>
        <label className="block text-sm font-semibold text-[#1F3D30] mb-1">Username</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={mode === 'edit'}
          className="w-full px-4 py-3 rounded-xl border border-[#D4CFC7] text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3D30]/20 disabled:bg-[#F0EAE2] disabled:text-[#5C7A6E]"
          placeholder="contoh: siswa002"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1F3D30] mb-1">Nama Display</label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#D4CFC7] text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3D30]/20"
          placeholder="Nama lengkap"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1F3D30] mb-2">Role</label>
        <div className="flex gap-2">
          {(['student', 'teacher', 'admin'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                role === r
                  ? `${ROLE_BADGES[r].bg} ring-2 ring-[#1F3D30]/10`
                  : 'bg-[#FBF8F4] text-[#5C7A6E] hover:bg-[#F0EAE2]'
              }`}
            >
              {ROLE_BADGES[r].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 bg-[#FBF8F4] text-[#1F3D30] rounded-xl text-sm font-semibold hover:bg-[#F0EAE2] transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] disabled:opacity-50 transition-colors"
        >
          {saving ? '⏳ Menyimpan...' : mode === 'create' ? 'Buat Akun' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}

// ── Main Page ──
export default function AdminUsersPage() {
  const { role } = useAuth();
  const { users, loading, error, refresh } = useAllUsers();

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<typeof users[0] | null>(null);
  const [deleteUser, setDeleteUser] = useState<typeof users[0] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<typeof users[0] | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [passwordBanner, setPasswordBanner] = useState<string | null>(null);

  // Filter + search + pagination
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // Filtered + searched
  const filtered = useMemo(() => {
    let list = users;
    if (filter !== 'all') list = list.filter(u => u.role === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.username.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q));
    }
    return list;
  }, [users, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page when filter/search changes
  useMemo(() => { if (page > totalPages) setPage(1); }, [filter, search, totalPages, page]);

  // ── Handlers ──
  const handleCreate = async (data: any) => {
    const result = await adminCreateUser({
      username: data.username,
      displayName: data.displayName,
      role: data.role,
    });
    if (result.ok) {
      setShowCreate(false);
      setPasswordBanner(result.password!);
      refresh();
      showToast(result.message, true);
    } else {
      showToast(result.message, false);
    }
  };

  const handleEdit = async (data: any) => {
    const result = await adminUpdateUser(data.id, {
      displayName: data.displayName,
      role: data.role,
    });
    if (result.ok) {
      setEditUser(null);
      refresh();
      showToast(result.message, true);
    } else {
      showToast(result.message, false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    const result = await adminDeleteUser(deleteUser.id);
    setDeleting(false);
    if (result.ok) {
      setDeleteUser(null);
      refresh();
      showToast(result.message, true);
    } else {
      showToast(result.message, false);
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    const result = await adminResetPassword(resetTarget.id);
    if (result.ok) {
      setResetTarget(null);
      setPasswordBanner(result.password!);
      showToast(`✅ Password ${resetTarget.username} berhasil direset!`, true);
    } else {
      showToast(result.message, false);
    }
  };

  const handleSetPassword = async () => {
    if (!resetTarget) return;
    if (!newPassword.trim()) {
      showToast('⚠️ Password tidak boleh kosong.', false);
      return;
    }
    const result = await adminSetPassword(resetTarget.id, newPassword.trim());
    if (result.ok) {
      setPasswordBanner(newPassword.trim());
      setNewPassword('');
      setResetTarget(null);
      showToast(`✅ Password ${resetTarget.username} berhasil diubah!`, true);
    } else {
      showToast(result.message, false);
    }
  };

  if (role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg ${
          toast.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Password banner */}
      {passwordBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 relative">
          <button onClick={() => setPasswordBanner(null)} className="absolute top-3 right-3 text-emerald-600 hover:text-emerald-800 text-lg">✕</button>
          <p className="font-bold text-emerald-800 text-base">🔑 Password Akun Baru</p>
          <p className="text-emerald-700 text-sm mt-1">Catat dan sampaikan password ini ke user:</p>
          <p className="mt-2 font-mono font-bold text-lg text-emerald-900 bg-white rounded-xl px-4 py-2 border border-emerald-200 inline-block">
            {passwordBanner}
          </p>
          <p className="text-xs text-emerald-600 mt-2">Password bisa direset kapan saja dari halaman ini.</p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[#1F3D30]">👥 Kelola User</h1>
          <p className="text-sm text-[#5C7A6E] mt-0.5">{users.length} total user</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors"
        >
          + Tambah User Baru
        </button>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-4 py-2.5 rounded-xl border border-[#D4CFC7] text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3D30]/20 bg-white"
            placeholder="🔍 Cari username atau nama..."
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'student', 'teacher', 'admin'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-[#1F3D30] text-white'
                  : 'bg-[#FBF8F4] text-[#5C7A6E] hover:bg-[#F0EAE2]'
              }`}
            >
              {f === 'all' ? 'Semua' : ROLE_BADGES[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-semibold">{error}</p>
          <button onClick={refresh} className="mt-3 text-sm text-red-600 underline underline-offset-2">Coba lagi</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center">
          <p className="text-lg">🔍 User tidak ditemukan</p>
          <p className="text-sm text-[#5C7A6E] mt-1">Coba ubah filter atau kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E4DD]/60 bg-[#FBF8F4]">
                  <th className="text-left px-4 py-3 font-semibold text-[#5C7A6E] w-10">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#5C7A6E]">Username</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#5C7A6E]">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#5C7A6E]">Role</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#5C7A6E]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u, i) => (
                  <tr key={u.id} className="border-b border-[#E8E4DD]/30 hover:bg-[#FBF8F4] transition-colors">
                    <td className="px-4 py-3 text-[#5C7A6E] font-mono text-xs">{(page - 1) * ITEMS_PER_PAGE + i + 1}</td>
                    <td className="px-4 py-3 font-medium text-[#1F3D30]">{u.username}</td>
                    <td className="px-4 py-3 text-[#1F3D30]">{u.displayName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${ROLE_BADGES[u.role].bg}`}>
                        {ROLE_BADGES[u.role].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-lg hover:bg-[#F0EAE2] text-sm"
                          title="Edit"
                        >✏️</button>
                        <button
                          onClick={() => setResetTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-[#F0EAE2] text-sm"
                          title="Reset Password"
                        >🔄</button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-sm"
                          title="Hapus"
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#E8E4DD]/30">
            {paged.map((u, i) => (
              <div key={u.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#1F3D30]">{u.displayName}</p>
                    <p className="text-xs text-[#5C7A6E]">@{u.username}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${ROLE_BADGES[u.role].bg}`}>
                    {ROLE_BADGES[u.role].label}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-[#F0EAE2] text-sm">✏️</button>
                    <button onClick={() => setResetTarget(u)} className="p-1.5 rounded-lg hover:bg-[#F0EAE2] text-sm">🔄</button>
                    <button onClick={() => setDeleteUser(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-sm">🗑️</button>
                  </div>
                </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E4DD]/60 bg-[#FBF8F4]">
            <p className="text-xs text-[#5C7A6E]">
              Menampilkan {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} user
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#D4CFC7] disabled:opacity-30 hover:bg-[#F0EAE2] transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const num = start + i;
                if (num > totalPages) return null;
                return (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      page === num ? 'bg-[#1F3D30] text-white' : 'bg-white border border-[#D4CFC7] hover:bg-[#F0EAE2]'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#D4CFC7] disabled:opacity-30 hover:bg-[#F0EAE2] transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════ */}
      {/* MODALS */}
      {/* ════════════════════════════════════ */}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="➕ Tambah User Baru">
        <UserForm mode="create" onSave={handleCreate} onClose={() => setShowCreate(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="✏️ Edit User">
        {editUser && (
          <UserForm
            mode="edit"
            initial={{
              id: editUser.id,
              username: editUser.username,
              displayName: editUser.displayName ?? '',
              role: editUser.role,
            }}
            onSave={handleEdit}
            onClose={() => setEditUser(null)}
          />
        )}
      </Modal>

      {/* Ganti password modal */}
      <Modal open={!!resetTarget} onClose={() => { setResetTarget(null); setNewPassword(''); }} title="🔑 Ganti Password">
        {resetTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[#1F3D30]">
              Ganti password untuk <strong>{resetTarget.username}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#5C7A6E] mb-1.5">Password Baru</label>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
                className="w-full px-4 py-3 rounded-xl border border-[#D4CFC7] text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3D30]/20"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSetPassword(); }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setResetTarget(null); setNewPassword(''); }}
                className="flex-1 py-3 bg-[#FBF8F4] text-[#1F3D30] rounded-xl text-sm font-semibold hover:bg-[#F0EAE2]"
              >
                Batal
              </button>
              <button
                onClick={handleSetPassword}
                disabled={!newPassword.trim()}
                className="flex-1 py-3 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] disabled:opacity-50"
              >
                Simpan Password
              </button>
            </div>
            <div className="text-center pt-1">
              <button
                onClick={() => { setNewPassword(''); handleReset(); }}
                className="text-xs text-[#5C7A6E] hover:text-[#C8A84E] underline underline-offset-2"
              >
                Reset ke default (pasraman-{resetTarget.username})
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="🗑️ Hapus User">
        {deleteUser && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="font-semibold text-red-800">Hapus <strong>{deleteUser.username}</strong>?</p>
              <p className="text-sm text-red-700 mt-1">Semua data user ini akan ikut terhapus:</p>
              <ul className="text-xs text-red-600 mt-2 space-y-1 list-disc list-inside">
                <li>Progress belajar (bab selesai, materi dilihat)</li>
                <li>Nilai dan skor tugas</li>
                <li>Jawaban tugas yang dikumpulkan</li>
                <li>Akun login (tidak bisa login lagi)</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)} className="flex-1 py-3 bg-[#FBF8F4] text-[#1F3D30] rounded-xl text-sm font-semibold hover:bg-[#F0EAE2]">Batal</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting ? '⏳ Menghapus...' : '🗑️ Hapus User'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
