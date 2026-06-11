'use client';

import { useState, useRef, DragEvent } from 'react';

export interface UploadResult {
  fileId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  originalName?: string; // original filename before renaming
}

interface Props {
  maxSize?: number;
  accept?: string;
  onUploadSuccess: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  label?: string;
  disabled?: boolean;
  /** 'student' | 'teacher' — determines which Gdrive folder files land in */
  uploadType?: 'student' | 'teacher';
  /** When true, skip finalize (permission + rename). File stays private in Drive.
   *  Use for teacher edit mode where files are finalized on chapter save. */
  deferFinalize?: boolean;
}

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.doc,.docx,.ppt,.pptx,.txt,.csv,.zip,.rar';
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per chunk (Vercel Hobby limit)

export default function FileUpload({
  maxSize = 100 * 1024 * 1024,
  accept = DEFAULT_ACCEPT,
  onUploadSuccess,
  onUploadError,
  label,
  disabled = false,
  uploadType = 'student',
  deferFinalize = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(0);
    setPhase('Menyiapkan...');

    try {
      // Step 1: Init resumable upload session
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          uploadType,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        if (initData?.action === 'reauth') {
          setError('Akun Google Drive belum terhubung. Admin perlu login ulang.');
          if (onUploadError) onUploadError(initData.message || 'Reauth needed');
        } else {
          setError(initData.message || 'Gagal memulai upload.');
          if (onUploadError) onUploadError(initData.message || 'Init failed');
        }
        setUploading(false);
        return;
      }

      const { uploadUrl } = initData;
      setProgress(5);

      // Step 2: Upload in chunks via our server (bypasses CORS + Vercel size limit)
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let lastFileId: string | null = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size) - 1;
        const isLast = i === totalChunks - 1;
        const chunk = file.slice(start, end + 1);

        setPhase(`Mengupload potongan ${i + 1} dari ${totalChunks}...`);
        setProgress(5 + Math.round(((i) / totalChunks) * 70));

        const chunkForm = new FormData();
        chunkForm.append('uploadUrl', uploadUrl);
        chunkForm.append('chunk', chunk);
        chunkForm.append('start', String(start));
        chunkForm.append('end', String(end));
        chunkForm.append('total', String(file.size));
        chunkForm.append('isLast', isLast ? 'true' : 'false');

        const chunkRes = await fetch('/api/upload/chunk', {
          method: 'POST',
          body: chunkForm,
        });

        const chunkData = await chunkRes.json();
        if (!chunkRes.ok) throw new Error(chunkData.message || `Gagal upload potongan ${i + 1}`);

        if (chunkData.done && chunkData.fileId) {
          lastFileId = chunkData.fileId;
        }
      }

      setProgress(100);
      setPhase('✅ Selesai!');

      if (!lastFileId) throw new Error('File ID tidak diketahui setelah upload.');

      if (deferFinalize) {
        // Deferred mode: file stays private in Drive, return fileId + original name
        onUploadSuccess({ fileId: lastFileId, originalName: file.name });
      } else {
        // Immediate finalize: set public permission + get metadata
        setProgress(80);
        setPhase('Finalisasi...');

        const finalRes = await fetch('/api/upload/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: lastFileId }),
        });

        const finalData = await finalRes.json();
        if (!finalRes.ok) throw new Error(finalData.message || 'Gagal finalisasi upload.');

        setProgress(100);
        setPhase('✅ Selesai!');

        onUploadSuccess({
          fileUrl: finalData.data.fileUrl,
          fileName: finalData.data.fileName,
          fileSize: finalData.data.fileSize,
          fileId: finalData.data.fileId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (onUploadError) onUploadError(message);
    } finally {
      setUploading(false);
      setTimeout(() => { setProgress(0); setPhase(''); }, 3000);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      if (f.size > maxSize) {
        setError(`Ukuran file terlalu besar (maks ${(maxSize / 1024 / 1024).toFixed(0)}MB).`);
        return;
      }
      uploadFile(f);
    }
  };

  const handleSelect = () => {
    const f = inputRef.current?.files?.[0];
    if (f) {
      if (f.size > maxSize) {
        setError(`Ukuran file terlalu besar (maks ${(maxSize / 1024 / 1024).toFixed(0)}MB).`);
        return;
      }
      uploadFile(f);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' :
          dragOver ? 'border-[#1F3D30] bg-[#1F3D30]/5' :
          'border-[#1F3D30]/20 hover:border-[#1F3D30]/40 bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="space-y-2">
            <div className="text-xs text-[#5C7A6E]">{phase}</div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1F3D30] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-[#8A9E95]">{progress}%</span>
          </div>
        ) : (
          <div className="text-sm text-[#5C7A6E]">
            {label || (
              <>
                <span className="font-medium text-[#1F3D30]">Klik atau seret file</span> ke sini
                <br />
                <span className="text-[11px]">
                  Maks {(maxSize / 1024 / 1024).toFixed(0)}MB
                  {accept !== '*' && ` — ${accept.split(',').slice(0, 3).join(', ')}${accept.split(',').length > 3 ? '...' : ''}`}
                </span>
              </>
            )}
          </div>
        )}

        {!uploading && (
          <div className="mt-2 text-[10px] text-[#8A9E95]">
            {uploadType === 'teacher' ? '👨‍🏫 Upload sebagai Guru' : '🎒 Upload sebagai Murid'}
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
