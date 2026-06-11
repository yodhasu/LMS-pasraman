import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy a file chunk to Google Drive's resumable upload session.
 * Each chunk MUST be < 4MB to stay within Vercel Hobby plan limits.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadUrl = formData.get('uploadUrl') as string;
    const chunkFile = formData.get('chunk') as File | null;
    const start = parseInt(formData.get('start') as string, 10);
    const end = parseInt(formData.get('end') as string, 10);
    const total = parseInt(formData.get('total') as string, 10);
    const isLast = formData.get('isLast') === 'true';

    if (!uploadUrl || !chunkFile) {
      return NextResponse.json({ ok: false, message: 'uploadUrl dan chunk diperlukan.' }, { status: 400 });
    }

    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());
    const contentRange = `bytes ${start}-${end}/${total}`;
    const contentLength = isLast ? chunkBuffer.length : chunkBuffer.length;

    const headers: Record<string, string> = {
      'Content-Length': String(contentLength),
      'Content-Range': contentRange,
    };

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: chunkBuffer,
    });

    // For the final chunk, Google returns 200 with file metadata (or 201)
    // For intermediate chunks, Google returns 308 Resume Incomplete
    if (isLast) {
      if (!res.ok) {
        const err = await res.text().catch(() => 'Unknown error');
        throw new Error(`Drive final chunk failed (${res.status}): ${err}`);
      }
      // Parse the file metadata from response
      const fileData = await res.json();
      return NextResponse.json({ ok: true, done: true, fileId: fileData.id, fileData });
    } else {
      // Intermediate chunk - expect 308
      if (res.status !== 308) {
        // Some chunks might also return 200 if the upload completed
        if (res.ok) {
          const fileData = await res.json().catch(() => null);
          return NextResponse.json({ ok: true, done: true, fileId: fileData?.id, fileData });
        }
        const err = await res.text().catch(() => 'Unknown error');
        throw new Error(`Drive chunk upload failed (${res.status}): ${err}`);
      }
      return NextResponse.json({ ok: true, done: false });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/upload/chunk error:', message);
    return NextResponse.json({ ok: false, message: `Gagal upload chunk: ${message}` }, { status: 500 });
  }
}
