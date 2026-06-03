# feat: Vercel Migration + Firebase Removal + Security Audit

## Summary

Migrate LMS Pasraman from Firebase Hosting → Vercel. Remove all Firebase artifacts, clean up Next.js config for native Vercel deployment, and audit codebase for vulnerabilities.

AGY headless testing was blocked (requires Google OAuth), so **manual stress test performed** via browser + curl.

---

## ✅ What's Done

### 🔥 Firebase Removed
- Deleted `firebase.json`, `.firebaserc`, `firestore.rules`, `.firebase/` dir
- Updated `.gitignore` — removed firebase-specific patterns
- Updated `pnpm-workspace.yaml` — removed `@firebase/util`
- Fixed `page.tsx` comment — Firebase rewrite → hosting provider

### 🚀 Vercel-Ready
- `next.config.ts`: removed `output: 'export'`, `images.unoptimized`
- Build verified: **16 pages** (15 static + 1 SSG with `generateStaticParams`)
- Dynamic routes (`[chapterId]`) → `generateStaticParams` + on-demand SSR for new chapters
- Updated `HANDOVER.md` with Vercel deploy instructions

### 🧹 Code Cleanup
- Clean `pnpm-workspace.yaml` (no more Firebase build deps)
- Updated `HANDOVER.md` with current state

---

## 🔒 Security Audit — 17 Findings

Audited by Vela via DeepSeek-r1 over all `src/` + `supabase/migrations/`. **No XSS or SQL injection found.**

### 🔴 CRITICAL (4)

| ID | Issue | Fix |
|----|-------|-----|
| C-1 | `mcq_questions` RLS grants `anon` SELECT — `correct_index` exposed | Restrict anon or create teacher-only view |
| C-2 | Temporary migration gave `anon` full CRUD on content tables | Already reverted — verify `drop_*` migration ran |
| C-3 | Plaintext password in RPC body (`verify_user_password`) | Use `signInWithPassword` directly |
| C-4 | SECURITY DEFINER functions callable by `anon` | `revoke execute` from anon |

### 🟠 HIGH (4)

| ID | Issue | Fix |
|----|-------|-----|
| H-1 | Client fetches all submissions without `.eq('user_id')` | Add explicit filters |
| H-2 | `pasraman123` hardcoded in 2 migration files | Use `current_setting('app.seed_password')` |
| H-3 | Student progress/scores deleted unconditionally on teacher edit | Only delete when question content changes |
| H-4 | SECURITY DEFINER search path includes `extensions` | Use `set search_path = public` |

### 🟡 MEDIUM (4)
- M-1: Client-side rate limiting bypassable by page refresh
- M-2: `window.location.reload()` used for dashboard refresh
- M-3: Correct answers exposed client-side after MCQ submission
- M-4: Loose `search_path` in SECURITY DEFINER functions

### 🔵 LOW (5)
- L-1: Dynamic import in AuthContext (timing attack vector)
- L-2: User display name stored as plaintext
- L-3: No HTTPS enforcement via CSP
- L-4: Leaked password protection disabled on Supabase
- L-5: `X-Powered-By: Next.js` header leaks framework version

---

## 🧪 Manual Stress Test Results

AGY blocked by Google OAuth → tested manually via browser + curl:

### ✅ All PASS
| Test | Result |
|------|--------|
| 8 pages load (/, /login, /materi, /materi/bab-1/2, /dashboard, /nilai, /tugas) | HTTP 200 ✅ |
| 0 JS console errors on any page | PASS ✅ |
| Login as guru001/pasraman123 | SUCCESS ✅ |
| XSS path injection | 404 blocked ✅ |
| SQLi path injection | 404 blocked ✅ |
| 404 page for nonexistent routes | Proper 404 ✅ |
| No hardcoded API keys in source | PASS ✅ |
| No open CORS headers | PASS ✅ |
| Server-side API routes | N/A (client-side only) |
| No security headers (CSP, X-Frame-Options) | ⚠️ MISSING |
| `X-Powered-By: Next.js` leaks framework | ⚠️ LOW |

---

## 🚀 Vercel Deployment Steps

1. Go to https://vercel.com → Add New Project
2. Import `yodhasu/LMS-pasraman`
3. **Set env vars:**
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://qohkwhtgazvhcygqnehg.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`
4. Deploy — Vercel auto-detects Next.js
5. Custom domain optional

**No `vercel.json` needed** — Next.js default config handles everything.

---

## ⚠️ Before Merge

**DO NOT MERGE** until:
1. Codex reviews and approves
2. At minimum C-1, C-3, H-1, H-2 security findings addressed
3. Vercel deployment verified on preview URL
4. Firebase hosting decommissioned

---

## Files Changed

```
D  .firebaserc
M  .gitignore
A  .github/PULL_REQUEST_TEMPLATE/vercel-migration-pr.md
M  HANDOVER.md
A  docs/plans/2026-06-02-lms-prototype-teacher-flow-and-reset-plan.md
D  firebase.json
D  firestore.rules
M  next.config.ts
M  pnpm-workspace.yaml
M  src/app/materi/[chapterId]/page.tsx
```
