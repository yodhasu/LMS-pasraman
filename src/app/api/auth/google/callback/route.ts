import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

// Initialize Supabase admin client for storing tokens
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} — ${err}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle OAuth error (user denied, etc.)
  if (error) {
    return new Response(
      `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FBF8F4">
        <div style="background:white;padding:2rem;border-radius:1rem;max-width:400px;text-align:center">
          <span style="font-size:3rem">❌</span>
          <h1 style="font-size:1.25rem;margin:1rem 0">Otorisasi Ditolak</h1>
          <p style="color:#666">${error === 'access_denied' ? 'Anda menolak akses ke Google Drive.' : 'Terjadi kesalahan: ' + error}</p>
          <a href="/api/auth/google" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#1F3D30;color:white;border-radius:0.75rem;text-decoration:none;font-size:0.875rem">Coba Lagi</a>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new Response(
      `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FBF8F4">
        <div style="background:white;padding:2rem;border-radius:1rem;max-width:400px;text-align:center">
          <span style="font-size:3rem">⚠️</span>
          <h1 style="font-size:1.25rem;margin:1rem 0">Kode Tidak Ditemukan</h1>
          <p style="color:#666">Tidak ada kode otorisasi. Mulai ulang dari awal.</p>
          <a href="/api/auth/google" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#1F3D30;color:white;border-radius:0.75rem;text-decoration:none;font-size:0.875rem">Mulai Otorisasi</a>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const tokens = await exchangeCode(code);
    const { access_token, refresh_token, expires_in } = tokens;

    if (!refresh_token) {
      // Refresh token might not come if user already authorized without prompt=consent
      return new Response(
        `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FBF8F4">
          <div style="background:white;padding:2rem;border-radius:1rem;max-width:400px;text-align:center">
            <span style="font-size:3rem">⚠️</span>
            <h1 style="font-size:1.25rem;margin:1rem 0">Refresh Token Tidak Didapatkan</h1>
            <p style="color:#666">Google tidak memberikan refresh token. Coba lagi dengan <code>prompt=consent</code>.</p>
            <a href="/api/auth/google" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#1F3D30;color:white;border-radius:0.75rem;text-decoration:none;font-size:0.875rem">Coba Lagi</a>
          </div>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Store tokens in Supabase settings table
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const expires_at = Math.floor(Date.now() / 1000) + expires_in;

    const { error: upsertError } = await supabase
      .from('app_settings')
      .upsert(
        { key: 'google_drive_refresh_token', value: refresh_token },
        { onConflict: 'key' }
      );

    if (upsertError) {
      throw new Error(`Failed to store refresh token: ${upsertError.message}`);
    }

    // Also store access token with TTL
    await supabase.from('app_settings').upsert(
      { key: 'google_drive_access_token', value: access_token },
      { onConflict: 'key' }
    );
    await supabase.from('app_settings').upsert(
      { key: 'google_drive_token_expires_at', value: String(expires_at) },
      { onConflict: 'key' }
    );

    // Success page
    return new Response(
      `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FBF8F4">
        <div style="background:white;padding:2rem;border-radius:1rem;max-width:400px;text-align:center">
          <span style="font-size:3rem">✅</span>
          <h1 style="font-size:1.25rem;margin:1rem 0;color:#1F3D30">Otorisasi Berhasil!</h1>
          <p style="color:#5C7A6E">Google Drive sudah terhubung ke LMS Pasraman.</p>
          <p style="font-size:0.75rem;color:#8A9E95;margin-top:0.5rem">Refresh token tersimpan. Upload file sekarang bisa digunakan.</p>
          <a href="/dashboard" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#1F3D30;color:white;border-radius:0.75rem;text-decoration:none;font-size:0.875rem">← Kembali ke Dashboard</a>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FBF8F4">
        <div style="background:white;padding:2rem;border-radius:1rem;max-width:400px;text-align:center">
          <span style="font-size:3rem">❌</span>
          <h1 style="font-size:1.25rem;margin:1rem 0">Gagal Menyimpan Token</h1>
          <p style="color:#666;font-size:0.875rem">${message}</p>
          <a href="/api/auth/google" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#1F3D30;color:white;border-radius:0.75rem;text-decoration:none;font-size:0.875rem">Coba Lagi</a>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
