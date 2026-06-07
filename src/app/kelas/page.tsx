'use client';

import { useAuth } from '@/lib/AuthContext';
import { useTeacherClasses, useStudentsByClass, createClass, updateClass, deleteClass, addStudentToClass, removeStudentFromClass, fetchUnassignedStudents } from '@/lib/supabase-data';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

export default function KelasPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const { classes, loading: clsLoading, refreshClasses } = useTeacherClasses();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [studentRefreshKey, setStudentRefreshKey] = useState(0);
  const { students, loading: stdLoading } = useStudentsByClass(selectedClass, studentRefreshKey);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [showStudents, setShowStudents] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [unassigned, setUnassigned] = useState<Array<{ id: string; username: string; displayName: string | null }>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSemester, setFormSemester] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const isTeacherOrAdmin = role === 'teacher' || role === 'admin';

  // Redirect non-teacher
  useEffect(() => {
    if (!authLoading && !isTeacherOrAdmin && user) {
      router.push('/dashboard');
    }
  }, [authLoading, isTeacherOrAdmin, user, router]);

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    const res = await createClass(formName.trim(), formDesc.trim(), formSemester.trim(), user?.uid ?? '');
    if (res.ok) {
      setShowCreate(false);
      setFormName('');
      setFormDesc('');
      setFormSemester('');
      refreshClasses();
    }
    showMsg(res.message);
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent, classId: string) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    const res = await updateClass(classId, { name: formName.trim(), description: formDesc.trim(), semester: formSemester.trim() });
    if (res.ok) {
      setShowEdit(null);
      setFormName('');
      setFormDesc('');
      setFormSemester('');
      refreshClasses();
    }
    showMsg(res.message);
    setSaving(false);
  };

  const handleDelete = async (classId: string) => {
    setSaving(true);
    const res = await deleteClass(classId);
    showMsg(res.message);
    setShowDelete(null);
    if (res.ok) refreshClasses();
    setSaving(false);
  };

  const openEdit = (c: typeof classes[0]) => {
    setFormName(c.name);
    setFormDesc(c.description);
    setFormSemester(c.semester);
    setShowEdit(c.id);
  };

  const openCreate = () => {
    setFormName('');
    setFormDesc('');
    setFormSemester('');
    setShowCreate(true);
  };

  const openStudents = (classId: string) => {
    setSelectedClass(classId);
    setShowStudents(classId);
    setUnassigned([]);
  };

  const handleAddStudent = async (userId: string, classId: string) => {
    const res = await addStudentToClass(userId, classId);
    showMsg(res.message);
    if (res.ok) {
      setStudentRefreshKey(k => k + 1);
    }
  };

  const handleRemoveStudent = async (userId: string) => {
    const res = await removeStudentFromClass(userId);
    showMsg(res.message);
    if (res.ok) {
      setStudentRefreshKey(k => k + 1);
    }
  };

  const loadUnassigned = useCallback(async () => {
    const list = await fetchUnassignedStudents();
    setUnassigned(list);
  }, []);

  useEffect(() => {
    if (showAddStudent && showStudents) {
      loadUnassigned();
    }
  }, [showAddStudent, showStudents, loadUnassigned]);

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">🏫 Kelola Kelas</h1>
          <p className="text-sm text-[#5C7A6E] mt-0.5">Atur kelas dan daftar siswa</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors"
        >
          + Tambah Kelas
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-xl ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      {/* Class list */}
      {clsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center">
          <p className="text-lg">📭 Belum ada kelas</p>
          <p className="text-sm text-[#5C7A6E] mt-2">Buat kelas baru untuk mulai mengelola siswa.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {classes.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">{c.name}</h3>
                  {c.semester && <p className="text-xs text-[#C8A84E] font-medium mt-0.5">{c.semester}</p>}
                  {c.description && <p className="text-sm text-[#5C7A6E] mt-1 line-clamp-2">{c.description}</p>}
                </div>
                <button
                  onClick={() => openStudents(c.id)}
                  className="flex-shrink-0 px-3 py-1.5 bg-[#f0f4ec] text-[#1F3D30] rounded-lg text-xs font-semibold hover:bg-[#e0e8d8] transition-colors"
                >
                  Lihat Siswa →
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#1F3D30]/5">
                <button
                  onClick={() => openEdit(c)}
                  className="text-xs text-[#5C7A6E] hover:text-[#1F3D30] underline underline-offset-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDelete(c.id)}
                  className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => !saving && setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">+ Tambah Kelas Baru</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">Nama Kelas *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="contoh: Kelas 1" required
                  className="w-full px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">Deskripsi</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  placeholder="Deskripsi kelas (opsional)" rows={2}
                  className="w-full px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">Semester</label>
                <input type="text" value={formSemester} onChange={e => setFormSemester(e.target.value)}
                  placeholder="contoh: Ganjil 2026"
                  className="w-full px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 border border-[#d4dcd0] rounded-xl text-sm font-semibold text-[#5C7A6E] hover:bg-[#FBF8F4] transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving || !formName.trim()}
                  className="flex-1 py-3 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors disabled:opacity-60">
                  {saving ? '⏳' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => !saving && setShowEdit(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">✏️ Edit Kelas</h2>
            <form onSubmit={e => handleEdit(e, showEdit)} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">Nama Kelas *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required
                  className="w-full px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">Deskripsi</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
                  className="w-full px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">Semester</label>
                <input type="text" value={formSemester} onChange={e => setFormSemester(e.target.value)}
                  className="w-full px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(null)}
                  className="flex-1 py-3 border border-[#d4dcd0] rounded-xl text-sm font-semibold text-[#5C7A6E] hover:bg-[#FBF8F4] transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving || !formName.trim()}
                  className="flex-1 py-3 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors disabled:opacity-60">
                  {saving ? '⏳' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => !saving && setShowDelete(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2">⚠️ Hapus Kelas?</h2>
            <p className="text-sm text-[#5C7A6E] mb-4">Siswa di kelas ini akan menjadi tanpa kelas (unassigned). Data progress siswa tidak akan hilang.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(null)}
                className="flex-1 py-3 border border-[#d4dcd0] rounded-xl text-sm font-semibold text-[#5C7A6E] hover:bg-[#FBF8F4] transition-colors">
                Batal
              </button>
              <button onClick={() => handleDelete(showDelete)} disabled={saving}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
                {saving ? '⏳' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Students Panel ── */}
      {showStudents && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => { setShowStudents(null); setShowAddStudent(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#1F3D30]/5 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-bold text-lg">👥 {classes.find(c => c.id === showStudents)?.name ?? 'Kelas'}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddStudent(true); }}
                  className="px-3 py-1.5 bg-[#1F3D30] text-white rounded-lg text-xs font-semibold hover:bg-[#2A4D3E] transition-colors"
                >
                  + Tambah Siswa
                </button>
                <button onClick={() => { setShowStudents(null); setShowAddStudent(false); }}
                  className="text-xl text-[#8A9E95] hover:text-[#1F3D30]">✕</button>
              </div>
            </div>

            {showAddStudent && (
              <div className="p-4 border-b border-[#1F3D30]/5 bg-[#FBF8F4]">
                <h3 className="text-sm font-semibold text-[#3a5e4a] mb-2">Tambah Siswa ke Kelas</h3>
                {unassigned.length === 0 ? (
                  <p className="text-xs text-[#8A9E95]">Semua siswa sudah memiliki kelas.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {unassigned.map(s => (
                      <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white transition-colors">
                        <span className="text-sm">{s.displayName ?? s.username}</span>
                        <button
                          onClick={() => handleAddStudent(s.id, showStudents)}
                          className="text-xs text-[#1F3D30] font-semibold bg-white px-2.5 py-1 rounded-lg border border-[#d4dcd0] hover:bg-[#f0f4ec] transition-colors"
                        >
                          + Tambah
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowAddStudent(false)}
                  className="text-xs text-[#8A9E95] hover:text-[#1F3D30] mt-2 underline underline-offset-2">
                  Tutup
                </button>
              </div>
            )}

            <div className="p-5">
              {stdLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#8A9E95]">Belum ada siswa di kelas ini.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#8A9E95] uppercase tracking-wide">{students.length} Siswa</p>
                  {students.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#FBF8F4]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-[#1F3D30] text-white text-xs flex items-center justify-center flex-shrink-0">
                          {(s.displayName ?? s.username)[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{s.displayName ?? s.username}</p>
                          <p className="text-[11px] text-[#8A9E95]">@{s.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(s.id)}
                        className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 flex-shrink-0 ml-2"
                      >
                        Keluarkan
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
