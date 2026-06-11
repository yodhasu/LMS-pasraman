import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;


/**
 * Get a valid access token from the settings table.
 * If expired, uses refresh token to get a new one.
 */
async function getAccessToken(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Read stored tokens
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value');

  if (!settings) throw new Error('Settings table not accessible');

  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  const refreshToken = map['google_drive_refresh_token'];
  const accessToken = map['google_drive_access_token'];
  const expiresAt = parseInt(map['google_drive_token_expires_at'] || '0', 10);

  // If token is still valid, use it
  if (accessToken && expiresAt > Math.floor(Date.now() / 1000) + 60) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error('No refresh token. Visit /api/auth/google to authorize.');
  }

  // Refresh the token
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
    throw new Error(`Token refresh failed: ${res.status} — ${err}`);
  }

  const tokens = await res.json();
  const { access_token, expires_in } = tokens;
  const new_expires_at = Math.floor(Date.now() / 1000) + (expires_in || 3600);

  // Save new tokens
  await supabase.from('app_settings').upsert(
    { key: 'google_drive_access_token', value: access_token },
    { onConflict: 'key' }
  );
  await supabase.from('app_settings').upsert(
    { key: 'google_drive_token_expires_at', value: String(new_expires_at) },
    { onConflict: 'key' }
  );

  return access_token;
}

interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileId: string;
  mimeType: string;
}

/**
 * Upload a file to Google Drive.
 * Streams directly from the uploaded file buffer to avoid temp files.
 */
async function uploadToDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folderId?: string | null,
): Promise<UploadResult> {
  const accessToken = await getAccessToken();

  // Step 1: Create metadata
  const metadata = {
    name: fileName,
    mimeType,
    parents: folderId ? [folderId] : undefined,
  };

  // Step 2: Multipart upload (metadata + file content)
  const boundary = '-------' + Date.now();
  const delimiter = '\r\n--' + boundary;
  const closeDelim = delimiter + '--';

  const metadataPart = JSON.stringify(metadata);
  const body = Buffer.concat([
    Buffer.from(delimiter + '\r\n'),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(metadataPart),
    Buffer.from(delimiter + '\r\n'),
    Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(closeDelim),
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload failed: ${res.status} — ${err}`);
  }

  const file = await res.json();

  // Step 3: Make file publicly accessible via link
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );

  // Direct download link
  const directUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;

  return {
    fileUrl: file.webViewLink || directUrl,
    fileName: file.name,
    fileSize: parseInt(file.size || '0', 10),
    fileId: file.id,
    mimeType: file.mimeType,
  };
}

export { getAccessToken, uploadToDrive };
export type { UploadResult };
