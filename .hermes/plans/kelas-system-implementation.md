# Implementasi Sistem Kelas — LMS Pasraman

## Latar Belakang

Saat ini `app_users` cuma punya `class_name` (text) + `semester` (text) — flat, tanpa relasi. Guru tidak punya cara untuk:

- Melihat progress siswa per kelas
- Mengelola data siswa (tambah/hapus/edit)
- Filter nilai per kelas

## Ringkasan Perubahan

### DB Layer
- Table `classes` (id, name, description, teacher_id, semester, created_at, updated_at)
- Kolom `class_id` di `app_users` (FK → classes.id)
- RLS: teacher lihat class-nya sendiri, admin lihat semua
- **Tidak hapus** `class_name` dulu — backward compat, drop nanti

### App Layer
- **Halaman Kelola Kelas** (`/kelas`) — admin & teacher
  - Teacher: CRUD class-nya sendiri, lihat siswa per class, tambah/hapus siswa
  - Admin: lihat semua class, assign teacher
- **Navigasi** — tambah icon Kelas di BottomNav + Sidebar (hanya untuk teacher/admin)
- **Halaman Nilai** — upgrade untuk teacher: filter per class, lihat semua siswa
- **Halaman Dashboard** — upgrade teacher: class overview
- **Registrasi** — assign class ke siswa pas login/registrasi

---

## Phase 1: Database Migration

### 1.1 Buat tabel `classes`

```sql
CREATE TABLE public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  teacher_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  semester TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Tambah `class_id` ke `app_users`

```sql
ALTER TABLE public.app_users
  ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
```

### 1.3 RLS untuk `classes`

```sql
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Teacher bisa lihat class-nya sendiri; admin lihat semua
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Teacher bisa manage class-nya sendiri; admin manage semua
CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );
```

### 1.4 Update RLS `app_users` untuk akses teacher

Teacher perlu lihat data siswa di class-nya (untuk nilai, progress tracking). Saat ini RLS `app_users` mungkin hanya allow read own row.

```sql
-- Allow teacher lihat siswa di class-nya
-- (check existing RLS policies first, adjust accordingly)
CREATE POLICY "app_users_teacher_read_class" ON public.app_users
  FOR SELECT TO authenticated
  USING (
    role = 'student'
    AND class_id IN (
      SELECT id FROM public.classes WHERE teacher_id = auth.uid()
    )
  );
```

### 1.5 Migration file

File: `supabase/migrations/20260607_create_classes_table.sql`

**Migration checklist:**
- [x] SQL tertulis
- [ ] Apply ke DB via MCP
- [ ] Verify table exists
- [ ] Verify RLS works
- [ ] Seed sample data untuk testing

---

## Phase 2: Type Definitions

### 2.1 Tambah tipe di `src/lib/types.ts`

```typescript
export interface ClassEntry {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  semester: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassWithStudents extends ClassEntry {
  students: Array<{
    id: string;
    username: string;
    displayName: string | null;
  }>;
}

export interface StudentWithProgress {
  id: string;
  username: string;
  displayName: string | null;
  progress: StudentProgressMap;
  scores: ScoreRecord[];
}
```

### 2.2 Update tipe `LmsUser` di `AuthContext.tsx`

Tambah field `classId` ke interface LmsUser.

```typescript
export interface LmsUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  classId?: string | null; // NEW
}
```

---

## Phase 3: Data Layer

### 3.1 Tambah hooks di `src/lib/supabase-data.ts`

**Hooks baru:**

| Hook | Fungsi |
|------|--------|
| `useTeacherClasses()` | Fetch classes by teacher_id (current user) |
| `useStudentsByClass(classId)` | Fetch students dalam suatu class |
| `useTeacherNilai(classId?)` | Fetch scores untuk semua siswa di class tertentu |
| `useTeacherProgress(classId?)` | Fetch chapter_progress untuk semua siswa |

**Functions baru:**

| Function | Fungsi |
|----------|--------|
| `createClass(name, description, semester)` | INSERT ke classes table |
| `updateClass(classId, data)` | UPDATE classes |
| `deleteClass(classId)` | DELETE classes (cascade?) |
| `addStudentToClass(userId, classId)` | UPDATE app_users.class_id |
| `removeStudentFromClass(userId)` | SET class_id = NULL |
| `fetchStudentsByClass(classId)` | SELECT app_users WHERE class_id = ... |
| `fetchUnassignedStudents()` | SELECT app_users WHERE role='student' AND class_id IS NULL |

---

## Phase 4: Halaman Kelola Kelas

### 4.1 `/kelas/page.tsx` — Halaman Baru

**Untuk Teacher:**
- List class yang dia ajar
- Tiap class: card dengan jumlah siswa, semester
- Tombol: Edit, Hapus (konfirmasi), Tambah Siswa
- Modal/Tab: daftar siswa per class dengan progress ringkas

**Untuk Admin:**
- Sama seperti teacher, tapi lihat SEMUA class
- Bisa assign teacher ke class

**Layout:**
```
┌─────────────────────────────────────┐
│  🏫 Kelola Kelas                     │
│  [+ Tambah Kelas]                    │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ Kelas 1 — Semester Ganjil 2026  │ │
│  │ 👤 Guru Pasraman  │ 8 siswa     │ │
│  │ [Edit] [Hapus] [Lihat Siswa →]  │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Kelas 2 — Semester Genap 2026   │ │
│  │ 👤 Guru Pasraman  │ 12 siswa    │ │
│  │ [Edit] [Hapus] [Lihat Siswa →]  │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4.2 Modal/Tab Detail Class

Saat klik "Lihat Siswa":
```
┌─────────────────────────────────────┐
│  🏫 Kelas 1 — 8 Siswa         [Tutup] │
│  [+ Tambah Siswa]                    │
│                                       │
│  ┌────┬────────┬─────────┬─────────┐ │
│  │ No │ Nama   │ Progress │ Nilai   │ │
│  ├────┼────────┼─────────┼─────────┤ │
│  │ 1  │ Budi   │ 3/6 bab  │ 85      │ │
│  │ 2  │ Sari   │ 6/6 bab  │ 92      │ │
│  └────┴────────┴─────────┴─────────┘ │
└─────────────────────────────────────┘
```

---

## Phase 5: Update Halaman Nilai

### 5.1 Fitur Teacher View di `/nilai`

**Saat login sebagai teacher:**
- Dropdown pilih class
- Setelah pilih class: tabel/list semua siswa dengan nilai per bab
- Bisa klik siswa untuk lihat detail nilai

**Saat login sebagai admin:**
- Sama seperti teacher, tapi bisa pilih SEMUA class + filter teacher

### 5.2 Update `useNilai` hook

Buat versi baru `useNilai(options?: { classId?: string; teacherView?: boolean })`:
- Default (student): seperti sekarang — filter by user_id
- Teacher view: filter by class_id → join ke app_users

---

## Phase 6: Update Dashboard & Navigasi

### 6.1 BottomNav + Sidebar

Tambah item "Kelas" dengan icon `🏫` — hanya muncul untuk role teacher/admin.

```typescript
const tabs = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/materi', label: 'Materi', icon: '📚' },
  { href: '/tugas', label: 'Tugas', icon: '📝' },
  { href: '/kelas', label: 'Kelas', icon: '🏫', roles: ['teacher', 'admin'] }, // NEW
  { href: '/nilai', label: 'Nilai', icon: '📊' },
];
```

### 6.2 Dashboard Teacher Upgrade

Tambah card ringkasan di dashboard teacher:
- Jumlah kelas yang dia ajar
- Jumlah total siswa
- Siswa belum selesai (progress < 100%)
- Link cepat ke `/kelas`

---

## Phase 7: Seed Data & Testing

### 7.1 Seed sample classes

Setelah migration: seed beberapa class sample + assign siswa ke class.

### 7.2 Test scenarios

| # | Scenario | Expectation |
|---|----------|-------------|
| 1 | Login sebagai teacher → lihat `/kelas` | List class kosong, ada tombol "+ Tambah Kelas" |
| 2 | Teacher create class | Class muncul di list, RLS allow |
| 3 | Teacher add siswa ke class | Siswa muncul di daftar siswa class |
| 4 | Login sebagai student → lihat `/kelas` | 404 atau redirect |
| 5 | Teacher lihat `/nilai` | Ada dropdown class, filter works |
| 6 | Admin lihat semua class | Bisa lihat class milik teacher lain |
| 7 | Teacher hapus class | Class hilang, siswa jadi unassigned |
| 8 | AGY cold QA | Verify no regression |

---

## Estimasi Effort

| Phase | Tasks | Estimasi |
|-------|-------|----------|
| 1. DB Migration | 1 migration file, apply | ~30 menit |
| 2. Types | Update types.ts + AuthContext | ~15 menit |
| 3. Data Layer | 8 hooks/functions di supabase-data.ts | ~45 menit |
| 4. Halaman Kelas | page.tsx + modal + komponen | ~90 menit |
| 5. Update Nilai | Teacher view + filter | ~45 menit |
| 6. Navigasi + Dashboard | Nav update + teacher dashboard card | ~30 menit |
| 7. Seed + Testing | Data seed + AGY QA | ~30 menit |
| **Total** | | **~4.5 jam** |

---

## Catatan

- **Buat branch baru** `feature/kelas-system` — jangan campur dengan branch lain
- **PR terpisah** — ini perubahan besar, butuh review berdiri sendiri
- **Migration nomor** — pastikan nomor migration > migration yang udah ada (20260607 sudah dipake PR #6, jadi pakai `20260608` atau `20260607_v2`)
- **Hapus `class_name`** — jangan hapus dulu dari `app_users`. Drop nanti di PR terpisah setelah nggak ada dependensi
- **Tidak ubah existing hooks** — buat hooks baru untuk teacher view, jangan refactor useNilai yang udah stabil
