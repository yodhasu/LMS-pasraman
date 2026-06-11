#!/usr/bin/env node
// Heartbeat: upload a dummy file to Google Drive, then delete it.
// This keeps the OAuth refresh token alive by ensuring weekly Drive API activity.
//
// Run by Hermes cron daily.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/home/yodha/projects/LMS-pasraman';
const envPath = path.join(PROJECT_DIR, '.env.local');

function getEnv(key) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(new RegExp(`^${key}=(.+)$`));
    if (m) return m[1].trim();
  }
  return null;
}

const CLIENT_ID = getEnv('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

async function getAccessToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.from('app_settings').select('key, value');
  if (!data) throw new Error('Cannot read app_settings');

  const map = Object.fromEntries(data.map(s => [s.key, s.value]));
  const refreshToken = map['google_drive_refresh_token'];
  const accessToken = map['google_drive_access_token'];
  const expiresAt = parseInt(map['google_drive_token_expires_at'] || '0', 10);

  // Use existing if still valid
  if (accessToken && expiresAt > Math.floor(Date.now() / 1000) + 300) {
    return { accessToken, supabase };
  }

  if (!refreshToken) throw new Error('No refresh token found');

  // Refresh
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Refresh failed: ${res.status} — ${err}`);
  }

  const tokens = await res.json();
  const newExpiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);

  await supabase.from('app_settings').upsert({ key: 'google_drive_access_token', value: tokens.access_token }, { onConflict: 'key' });
  await supabase.from('app_settings').upsert({ key: 'google_drive_token_expires_at', value: String(newExpiresAt) }, { onConflict: 'key' });

  return { accessToken: tokens.access_token, supabase };
}

async function heartbeat() {
  console.log(`[heartbeat] Starting at ${new Date().toISOString()}`);

  const { accessToken, supabase } = await getAccessToken();
  console.log('[heartbeat] Token valid');

  // Create a tiny dummy file
  const dummyContent = Buffer.from('heartbeat');
  const boundary = '-------' + Date.now();
  const metadata = JSON.stringify({ name: `.heartbeat_${Date.now()}.txt`, mimeType: 'text/plain' });

  const body = Buffer.concat([
    Buffer.from(`\r\n--${boundary}\r\n`),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\n`),
    Buffer.from('Content-Type: text/plain\r\n\r\n'),
    dummyContent,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  // Upload
  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} — ${err}`);
  }

  const file = await uploadRes.json();
  console.log(`[heartbeat] Dummy file uploaded: ${file.id}`);

  // Delete it
  const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!delRes.ok) {
    const err = await delRes.text();
    console.warn(`[heartbeat] Delete failed (non-critical): ${delRes.status} — ${err}`);
  } else {
    console.log(`[heartbeat] Dummy file deleted`);
  }

  // Also ensure app_settings table has refreshed expiry
  console.log('[heartbeat] Done — token refreshed and heartbeat recorded');
}

heartbeat().catch(err => {
  console.error('[heartbeat] FAILED:', err.message);
  process.exit(1);
});
