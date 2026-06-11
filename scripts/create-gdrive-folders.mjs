/**
 * Create guru/ and murid/ folders in Google Drive.
 * Stores folder IDs in app_settings table.
 * Run: node scripts/create-gdrive-folders.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load env from .env.local
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const eqIdx = l.indexOf('=');
      return [l.slice(0, eqIdx).trim(), l.slice(eqIdx + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_ID = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getAccessToken() {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value');

  if (!settings) throw new Error('Settings table not accessible');

  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const refreshToken = map['google_drive_refresh_token'];
  const accessToken = map['google_drive_access_token'];
  const expiresAt = parseInt(map['google_drive_token_expires_at'] || '0', 10);

  if (accessToken && expiresAt > Math.floor(Date.now() / 1000) + 60) {
    return accessToken;
  }

  if (!refreshToken) throw new Error('No refresh token found');

  console.log('Refreshing access token...');
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

  if (!res.ok) throw new Error(`Refresh failed: ${res.status} — ${await res.text()}`);

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

async function createFolder(accessToken, name) {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!res.ok) throw new Error(`Create folder "${name}" failed: ${res.status} — ${await res.text()}`);

  const data = await res.json();
  console.log(`✅ Folder "${name}" created: ${data.id}`);
  return data.id;
}

async function main() {
  const token = await getAccessToken();
  console.log('🔑 Access token obtained');

  const guruId = await createFolder(token, 'guru');
  const muridId = await createFolder(token, 'murid');

  // Store in DB
  await supabase.from('app_settings').upsert(
    { key: 'gdrive_guru_folder_id', value: guruId },
    { onConflict: 'key' }
  );
  await supabase.from('app_settings').upsert(
    { key: 'gdrive_murid_folder_id', value: muridId },
    { onConflict: 'key' }
  );

  console.log(`\n✅ Folder IDs stored in app_settings:`);
  console.log(`   gdrive_guru_folder_id  = ${guruId}`);
  console.log(`   gdrive_murid_folder_id = ${muridId}`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
