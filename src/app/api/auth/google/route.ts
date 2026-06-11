import { NextResponse } from 'next/server';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',  // create/read/update files created by app
  'https://www.googleapis.com/auth/drive.metadata.readonly', // read file metadata
];

export async function GET() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',     // REQUIRED — gives us refresh token
    prompt: 'consent',          // Forces refresh token even if re-authorizing
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}
