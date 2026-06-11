'use client';

import { useState, useRef, DragEvent } from 'react';

interface Props {
  /** Maximum file size in bytes (default 50MB) */
  maxSize?: number;
  /** Allowed MIME types */
  accept?: string;
  /** Called when file is selected — trigger the upload flow */
  onFileSelected: (file: File) => void;
  /** Whether upload is currently in progress */
  uploading?: boolean;
  /** Upload progress percentage (0-100) */
  progress?: number;
  /** Optional custom label */
  label?: string;
  /** Disable the uploader */
  disabled?: boolean;
}

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.doc,.docx,.ppt,.pptx,.txt,.csv,.zip,.rar';

export default function FileUpload({
  maxSize = 50 * 1024 * 1024, // 50MB
  accept = DEFAULT_ACCEPT,
  onFileSelected,
  uploading = false,
  progress = 0,
  label,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    onFileSelected(file);
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
    // Reset so re-selecting the same file triggers onChange
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

// ── Upload Not Available Modal ──

export function UploadNotAvailableModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-sm mx-4 p-6 text-center space-y-4 shadow-xl">
        <span className="text-5xl block">🚧</span>
        <h3 className="text-lg font-bold text-[#1F3D30]">Upload Belum Tersedia</h3>
        <p className="text-sm text-[#5C7A6E]">
          Fitur upload file masih dalam tahap pengembangan. Guru akan mengaktifkannya segera.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
