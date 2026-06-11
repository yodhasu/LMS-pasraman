import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getAccessToken(): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: settings } = await supabase.from('app_settings').select('key, value');
  if (!settings) throw new Error('Settings table not accessible');
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const refreshToken = map['google_drive_refresh_token'];
  const accessToken = map['google_drive_access_token'];
  const expiresAt = parseInt(map['google_drive_token_expires_at'] || '0', 10);
  if (accessToken && expiresAt > Math.floor(Date.now() / 1000) + 60) return accessToken;
  if (!refreshToken) throw new Error('No refresh token. Visit /api/auth/google to authorize.');
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tokens = await res.json();
  const new_expires_at = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);
  await supabase.from('app_settings').upsert(
    { key: 'google_drive_access_token', value: tokens.access_token },
    { onConflict: 'key' }
  );
  await supabase.from('app_settings').upsert(
    { key: 'google_drive_token_expires_at', value: String(new_expires_at) },
    { onConflict: 'key' }
  );
  return tokens.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { fileIds } = await request.json();

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ ok: false, message: 'Array fileIds diperlukan.' }, { status: 400 });
    }

    const token = await getAccessToken();

    const failedIds: string[] = [];

    // Process sequentially to avoid Drive rate limits
    for (const fileId of fileIds) {
      if (typeof fileId !== 'string' || !fileId) {
        failedIds.push(String(fileId));
        continue;
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );
        if (!res.ok && res.status !== 404) {
          // 404 = already deleted, treat as success
          const err = await res.text().catch(() => 'Unknown');
          console.warn(`Delete failed for ${fileId} (${res.status}): ${err}`);
          failedIds.push(fileId);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Delete error for ${fileId}:`, msg);
        failedIds.push(fileId);
      }
    }

    const succeededCount = fileIds.length - failedIds.length;

    return NextResponse.json({
      ok: failedIds.length === 0,
      deleted: succeededCount,
      failed: failedIds.length,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
      ...(failedIds.length > 0 ? { message: `${failedIds.length} file gagal dihapus.` } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/upload/cancel error:', message);
    if (message.includes('authorize') || message.includes('No refresh token')) {
      return NextResponse.json({
        ok: false, message: 'Akun Google Drive belum terhubung. Admin harus login dulu.',
        action: 'reauth', authUrl: '/api/auth/google',
      }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: `Gagal hapus file: ${message}` }, { status: 500 });
  }
}
