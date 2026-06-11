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
    const { fileName, mimeType, fileSize, uploadType, tag } = await request.json();

    if (!fileName) {
      return NextResponse.json({ ok: false, message: 'Nama file diperlukan.' }, { status: 400 });
    }

    const maxSize = 100 * 1024 * 1024; // consistent 100MB for all roles
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { ok: false, message: `Ukuran file terlalu besar (maks ${(maxSize / 1024 / 1024).toFixed(0)}MB).` },
        { status: 413 }
      );
    }

    const token = await getAccessToken();

    // Determine folder
    const folderKey = uploadType === 'teacher' ? 'gdrive_guru_folder_id' : 'gdrive_murid_folder_id';
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: folderSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', folderKey)
      .single();
    const folderId = folderSetting?.value || null;

    // Create resumable upload session
    const metadata: Record<string, unknown> = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
      description: `tag:${tag || 'none'} | original:${fileName} | upload_type:${uploadType || 'student'}`,
    };
    if (folderId) metadata.parents = [folderId];

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': mimeType || 'application/octet-stream',
          ...(fileSize ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Drive session failed: ${createRes.status} — ${err}`);
    }

    const uploadUrl = createRes.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL returned');

    return NextResponse.json({ ok: true, uploadUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/upload/init error:', message);
    if (message.includes('No refresh token') || message.includes('authorize') || message.includes('reauth')) {
      return NextResponse.json(
        { ok: false, message: 'Akun Google Drive belum terhubung. Admin harus login dulu.', action: 'reauth', authUrl: '/api/auth/google' },
        { status: 401 }
      );
    }
    return NextResponse.json({ ok: false, message: `Gagal: ${message}` }, { status: 500 });
  }
}
