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
  if (!refreshToken) throw new Error('No refresh token');
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
    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json({ ok: false, message: 'fileId diperlukan.' }, { status: 400 });
    }

    const token = await getAccessToken();

    // Set public permission
    const permRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      }
    );

    if (!permRes.ok) {
      const err = await permRes.text().catch(() => 'Unknown');
      console.warn('Set permission warning:', permRes.status, err);
      // Continue anyway — file might still be accessible
    }

    // Get file metadata
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webViewLink`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!metaRes.ok) throw new Error(`Failed to get file metadata: ${metaRes.status}`);

    const file = await metaRes.json();
    const directUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;

    return NextResponse.json({
      ok: true,
      data: {
        fileUrl: file.webViewLink || directUrl,
        fileName: file.name,
        fileSize: parseInt(file.size || '0', 10),
        fileId: file.id,
        mimeType: file.mimeType,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/upload/finalize error:', message);
    return NextResponse.json({ ok: false, message: `Gagal finalisasi: ${message}` }, { status: 500 });
  }
}
