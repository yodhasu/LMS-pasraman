'use client';

import { useState, useRef, DragEvent } from 'react';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileId: string;
}

interface Props {
  maxSize?: number;
  accept?: string;
  /** Called when upload succeeds — passes the uploaded file info */
  onUploadSuccess: (result: UploadResult) => void;
  /** Called when upload fails */
  onUploadError?: (error: string) => void;
  /** Optional custom label */
  label?: string;
  /** Disable the uploader */
  disabled?: boolean;
}

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.doc,.docx,.ppt,.pptx,.txt,.csv,.zip,.rar';

export default function FileUpload({
  maxSize = 50 * 1024 * 1024,
  accept = DEFAULT_ACCEPT,
  onUploadSuccess,
  onUploadError,
  label,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(0);

    // Simulate progress (real progress tracking needs XHR)
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 10, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'student');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      clearInterval(interval);
      setProgress(100);

      if (!res.ok) {
        const message = data?.message || 'Gagal mengupload file.';
        // Handle reauth case
        if (data?.action === 'reauth') {
          setError('Akun Google Drive belum terhubung. Admin perlu login ulang.');
          if (onUploadError) onUploadError(message);
        } else {
          setError(message);
          if (onUploadError) onUploadError(message);
        }
        setUploading(false);
        return;
      }

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        onUploadSuccess({
          fileUrl: data.data.fileUrl,
          fileName: data.data.fileName,
          fileSize: data.data.fileSize,
          fileId: data.data.fileId,
        });
      }, 300);
    } catch (err) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : 'Gagal mengupload file.';
      setError(message);
      if (onUploadError) onUploadError(message);
      setUploading(false);
    }
  };

  const validateFile = (file: File): boolean => {
    setError(null);
    if (file.size > maxSize) {
      setError(`Ukuran file terlalu besar (maks ${(maxSize / 1024 / 1024).toFixed(0)}MB).`);
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;
    uploadFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold text-[#5C7A6E]">{label}</p>
      )}

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${dragOver ? 'border-[#1F3D30] bg-[#1F3D30]/5 scale-[1.02]' : 'border-[#d4dcd0] hover:border-[#1F3D30]/40 bg-[#FBF8F4]'}
          ${uploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="space-y-2">
            <span className="text-2xl">⏳</span>
            <p className="text-xs text-[#5C7A6E]">Mengupload...</p>
            <div className="w-full h-2 bg-[#d4dcd0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1F3D30] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8A9E95]">{progress}%</p>
          </div>
        ) : dragOver ? (
          <div className="space-y-1">
            <span className="text-2xl">📥</span>
            <p className="text-xs font-medium text-[#1F3D30]">Lepaskan file di sini</p>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-2xl">📎</span>
            <p className="text-xs text-[#5C7A6E]">
              Drag & drop file, atau klik untuk memilih
            </p>
            <p className="text-[10px] text-[#8A9E95]">
              PDF, JPG, PNG, MP4, DOC, PPT — maks {(maxSize / 1024 / 1024).toFixed(0)}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
