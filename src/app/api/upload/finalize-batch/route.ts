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

// Sanitize filename: replace spaces with underscore, strip dangerous chars
function sanitizeName(name: string): string {
  return name
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 200);
}

/**
 * Mask an email for privacy (show first 2 chars + domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.length > 2 ? local.substring(0, 2) + '***' : local;
  return `${masked}@${domain}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const files: Array<{
      fileId: string;
      tag: string;
      originalName: string;
    }> = body.files;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ ok: false, message: 'Array files diperlukan.' }, { status: 400 });
    }

    const token = await getAccessToken();

    // Fetch username for audit trail
    let userName = 'unknown';
    try {
      const authHeader = request.headers.get('authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user?.email) {
          userName = maskEmail(user.email);
        } else if (user?.user_metadata?.display_name) {
          userName = user.user_metadata.display_name;
        }
      }
    } catch {
      // Non-critical — proceed without username
    }

    const results: Array<{
      fileId: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process sequentially to avoid Drive rate limits
    for (const item of files) {
      const { fileId, tag, originalName } = item;
      try {
        // 1. Rename: [tag]_originalName.ext
        const ext = originalName.includes('.')
          ? originalName.substring(originalName.lastIndexOf('.'))
          : '';
        const baseName = originalName.includes('.')
          ? originalName.substring(0, originalName.lastIndexOf('.'))
          : originalName;
        const cleanBase = sanitizeName(baseName);
        const cleanTag = sanitizeName(tag.toLowerCase().replace(/\s+/g, '-'));
        let newName = `[${cleanTag}]_${cleanBase}${ext}`;
        if (newName.length > 255) {
          // Truncate base if too long, preserving extension
          const maxBase = 255 - cleanTag.length - 7 - ext.length; // "[tag]_" + "..." + ext
          newName = `[${cleanTag}]_${cleanBase.substring(0, Math.max(maxBase, 10))}...${ext}`;
        }

        const renameRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: newName,
              description: `Uploaded by ${userName} | Original: ${originalName}`,
            }),
          }
        );

        if (!renameRes.ok) {
          const err = await renameRes.text().catch(() => 'Unknown');
          throw new Error(`Rename failed (${renameRes.status}): ${err}`);
        }

        // 2. Set public permission
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
          console.warn(`Permission set warning (${fileId}): ${permRes.status} — ${err}`);
          // Continue — file might already be accessible
        }

        // 3. Get metadata
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webViewLink`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!metaRes.ok) throw new Error(`Metadata fetch failed: ${metaRes.status}`);

        const file = await metaRes.json();

        results.push({
          fileId: file.id,
          fileUrl: file.webViewLink || `https://drive.google.com/uc?export=download&id=${file.id}`,
          fileName: file.name,
          fileSize: parseInt(file.size || '0', 10),
          mimeType: file.mimeType,
          success: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Finalize failed for file ${fileId}:`, message);
        results.push({
          fileId,
          fileUrl: '',
          fileName: '',
          fileSize: 0,
          mimeType: '',
          success: false,
          error: message,
        });
      }
    }

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const statusCode = failed.length > 0 ? 207 : 200;
    return NextResponse.json({
      ok: failed.length === 0,
      results,
      summary: {
        total: results.length,
        succeeded: succeeded.length,
        failed: failed.length,
      },
      ...(failed.length > 0 ? { message: `${failed.length} file gagal di-finalize.` } : {}),
    }, { status: statusCode });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/upload/finalize-batch error:', message);
    if (message.includes('authorize') || message.includes('No refresh token')) {
      return NextResponse.json({
        ok: false, message: 'Akun Google Drive belum terhubung. Admin harus login dulu.',
        action: 'reauth', authUrl: '/api/auth/google',
      }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: `Gagal finalisasi batch: ${message}` }, { status: 500 });
  }
}
