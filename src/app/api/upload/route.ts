import { NextRequest, NextResponse } from 'next/server';
import { uploadToDrive } from '@/lib/google-drive';

// Size limits
const STUDENT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const TEACHER_MAX_SIZE = 200 * 1024 * 1024; // 200MB

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string | null; // 'student' | 'teacher'

    if (!file) {
      return NextResponse.json(
        { ok: false, message: 'Tidak ada file yang diupload.' },
        { status: 400 }
      );
    }

    const maxSize = uploadType === 'teacher' ? TEACHER_MAX_SIZE : STUDENT_MAX_SIZE;

    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, message: `Ukuran file terlalu besar (maks ${(maxSize / 1024 / 1024).toFixed(0)}MB).` },
        { status: 413 }
      );
    }

    // Validate MIME type
    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED_TYPES.includes(mimeType) && !mimeType.startsWith('video/') && !mimeType.startsWith('image/')) {
      return NextResponse.json(
        { ok: false, message: `Tipe file "${mimeType}" tidak diizinkan.` },
        { status: 415 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive
    const result = await uploadToDrive(
      file.name,
      fileBuffer,
      mimeType,
      null, // no specific folder — uses root
    );

    return NextResponse.json({
      ok: true,
      message: 'File berhasil diupload.',
      data: {
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileId: result.fileId,
        mimeType: result.mimeType,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/upload error:', message);

    // Handle specific error cases
    if (message.includes('No refresh token') || message.includes('authorize')) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Akun Google Drive belum terhubung. Admin harus login dulu.',
          action: 'reauth',
          authUrl: '/api/auth/google',
        },
        { status: 401 }
      );
    }

    if (message.includes('Token refresh failed')) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Sesi Google Drive kedaluwarsa. Admin perlu login ulang.',
          action: 'reauth',
          authUrl: '/api/auth/google',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, message: 'Gagal mengupload file. Coba lagi.' },
      { status: 500 }
    );
  }
}
