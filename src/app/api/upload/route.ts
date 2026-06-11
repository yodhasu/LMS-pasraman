import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: 'Tidak ada file yang diupload.' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit for students, 200MB for teachers — checked client-side too)
    const MAX_SIZE = 200 * 1024 * 1024; // 200MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, message: `Ukuran file terlalu besar (maks ${MAX_SIZE / 1024 / 1024}MB).` },
        { status: 413 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/ogg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, message: `Tipe file "${file.type}" tidak diizinkan.` },
        { status: 415 }
      );
    }

    // PHASE 1 STUB — Gdrive integration coming in Phase 2
    // TODO: Implement actual file upload to Google Drive
    return NextResponse.json(
      {
        ok: false,
        message: 'Fitur upload file masih dalam tahap pengembangan. Guru akan mengaktifkannya segera.',
      },
      { status: 503 }
    );
  } catch (err) {
    console.error('/api/upload error:', err);
    return NextResponse.json(
      { ok: false, message: 'Terjadi kesalahan saat memproses upload.' },
      { status: 500 }
    );
  }
}
