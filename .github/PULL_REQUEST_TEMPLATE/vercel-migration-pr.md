# feat: Vercel Migration + Firebase Removal + Security Hardening

## Summary

Migrate LMS Pasraman from Firebase Hosting to Vercel. Remove all Firebase artifacts, clean up Next.js config for Vercel-native deployment, and audit codebase for vulnerabilities.

## Changes

### 🔥 Firebase Removed
- Delete `firebase.json`, `.firebaserc`, `firestore.rules`, `.firebase/`
- Update `.gitignore` — remove firebase-specific patterns
- Update `pnpm-workspace.yaml` — remove `@firebase/util` allowBuild

### 🚀 Vercel-Ready
- **`next.config.ts`**: Remove `output: 'export'` and `images.unoptimized` — Vercel handles SSR/static natively
- Build verified: **16 pages** (15 static + 1 SSG with `generateStaticParams`)
- Dynamic routes (`[chapterId]`) work via `generateStaticParams` + on-demand SSR for new chapters
- Updated `HANDOVER.md` with Vercel deployment instructions

### 🧹 Code Cleanup
- Fix comment in `page.tsx`: Firebase rewrite → hosting provider
- Update deploy command in `HANDOVER.md`: `firebase deploy` → `vercel --prod`

### 🔒 Security Audit — 17 Findings
Full audit done by Vela (DeepSeek-r1). **No XSS or SQL injection found.** Summary:

#### CRITICAL (4)
| ID | Issue | Fix |
|----|-------|-----|
| C-1 | `mcq_questions` RLS grants `anon` SELECT — `correct_index` exposed to anyone | Restrict anon access or create teacher-only view |
| C-2 | Temporary migrations gave `anon` full CRUD on content tables | Already reverted by `20260525_drop_*` migration — verify |
| C-3 | Plaintext password sent in RPC body (`verify_user_password`) | Use `signInWithPassword` directly or hash pre-commit |
| C-4 | `SECURITY DEFINER` functions callable by anon (`create_app_user`, `save_chapter_batch`, `delete_chapter`) | `revoke execute` from anon |

#### HIGH (4)
| ID | Issue | Fix |
|----|-------|-----|
| H-1 | All authenticated users can fetch ALL submissions (no `.eq('user_id')`) | Add explicit filters in client queries |
| H-2 | Seeded password `pasraman123` hardcoded in migrations | Use `current_setting('app.seed_password')` |
| H-3 | Student progress/scores deleted unconditionally on teacher edit | Only delete when question content changes |
| H-4 | SECURITY DEFINER search path includes `extensions` | Use `set search_path = public` |

#### MEDIUM (4) — rate limiting, `window.location.reload()`, student answer exposure, etc.
#### LOW (5) — dynamic import timing, PII exposure, HTTPS enforcement, etc.

### ✅ Dev Server
- Running at `localhost:3000` — ready for manual verification

### 🤖 AGY Stress Test
*(AGY running — results pending, will be added here once complete)*

## Vercel Deployment Steps

1. **Connect repo** at https://vercel.com → Add New → `yodhasu/LMS-pasraman`
2. **Set env vars:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. **Deploy** — Vercel auto-detects Next.js, builds, and deploys
4. **Custom domain** (optional): add `lmspasraman.web.app` or new domain

## Branch Strategy

This is a **preview PR** for Codex review. **DO NOT MERGE** until:
1. Codex reviews and approves
2. Security findings addressed (at least C-1, C-3, H-1, H-2)
3. Vercel deployment verified on preview URL
4. Firebase hosting can be decommissioned

## Files Changed

```
D  .firebaserc
M  .gitignore
M  HANDOVER.md
M  docs/plans/2026-06-02-lms-prototype-teacher-flow-and-reset-plan.md
D  firebase.json
D  firestore.rules
M  next.config.ts
M  pnpm-workspace.yaml
M  src/app/materi/[chapterId]/page.tsx
```

## Test Instructions

1. `pnpm dev` → visit `localhost:3000`
2. Login as `guru001` / `pasraman123`
3. Verify all pages load: `/`, `/login`, `/materi`, `/materi/bab-1`, `/dashboard`, `/nilai`, `/tugas`
4. Try teacher CRUD: edit bab, add material, save, delete
5. Verify no Firebase console errors
