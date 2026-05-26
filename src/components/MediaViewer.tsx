'use client';

import { useEffect } from 'react';

interface Props {
  url: string;
  caption?: string | null;
  onClose: () => void;
}

export default function MediaViewer({ url, caption, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isVideo = url.match(/\.(mp4|webm|ogg)$/i) || url.includes('youtube.com/watch') || url.includes('youtu.be') || url.includes('youtube.com/embed');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors z-10"
      >
        ✕
      </button>

      {/* Content */}
      <div
        className="max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <div className="relative w-full max-w-3xl aspect-video">
            <iframe
              src={url.includes('youtube') ? url : url}
              className="w-full h-full rounded-xl"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <img
              src={url}
              alt={caption ?? 'Media'}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
            />
            {caption && (
              <p className="text-sm text-white/80 text-center max-w-lg">{caption}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
