import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { username, displayName, role, classId } = await req.json();

    if (!username || !displayName) {
      return NextResponse.json(
        { ok: false, message: 'Username dan nama display wajib diisi' },
        { status: 400 },
      );
    }

    const password = `pasraman-${username}`;
    const email = `${username}@pasraman.id`;

    // 1. Create auth user via GoTrue Admin API
    const adminRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: PUBLISHABLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: displayName, username },
          app_metadata: { provider: 'email', providers: ['email'] },
        }),
      },
    );

    const adminData = await adminRes.json();

    if (!adminRes.ok) {
      console.error('GoTrue Admin API error:', adminData);
      return NextResponse.json(
        { ok: false, message: `Gagal membuat auth user: ${adminData.msg ?? 'unknown error'}` },
        { status: 500 },
      );
    }

    const userId = adminData.id;

    // 2. Create app_users record via REST API (bypasses RLS with service role)
    const appUserRes = await fetch(
      `${SUPABASE_URL}/rest/v1/app_users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: PUBLISHABLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: userId,
          email,
          username,
          display_name: displayName,
          role,
          password_hash: null, // No separate hash needed — GoTrue handles password
        }),
      },
    );

    if (!appUserRes.ok) {
      const appUserErr = await appUserRes.text();
      console.error('app_users insert error:', appUserErr);
      // Rollback: delete the auth user we just created
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      return NextResponse.json(
        { ok: false, message: 'Gagal membuat profil user' },
        { status: 500 },
      );
    }

    // 3. If classId provided, update class assignment
    if (classId) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/app_users?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: PUBLISHABLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ class_id: classId }),
        },
      );
    }

    return NextResponse.json({
      ok: true,
      userId,
      password,
      message: `✅ Akun ${username} berhasil dibuat!`,
    });
  } catch (err: any) {
    console.error('create-user API error:', err);
    return NextResponse.json(
      { ok: false, message: `⚠️ Gagal membuat user: ${err.message ?? 'unknown error'}` },
      { status: 500 },
    );
  }
}
