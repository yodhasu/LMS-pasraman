'use client';

/**
 * VideoPlayer — handles YouTube embed and Google Drive video playback.
 * Falls back to YouTubeEmbed for YouTube URLs, renders HTML5 <video>
 * for Drive-hosted videos using the direct download URL.
 */
export default function VideoPlayer({ url }: { url: string | null }) {
  if (!url) return null;

  // YouTube
  const ytId = url.includes('youtube.com/watch?v=')
    ? url.split('v=')[1]?.split('&')[0]
    : url.includes('youtu.be/')
    ? url.split('youtu.be/')[1]?.split('?')[0]
    : null;
  if (ytId) {
    return (
      <div className="my-6 rounded-xl overflow-hidden bg-black aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video Pembelajaran"
        />
      </div>
    );
  }

  // Google Drive — extract file ID and use direct download as video source
  const driveId = url.match(/\/file\/d\/([^/?#]+)/)?.[1]
    || url.match(/[?&]id=([^&]+)/)?.[1]
    || (url.includes('drive.google.com/uc?export=download&id=') ? url.split('id=')[1]?.split('&')[0] : null);

  if (driveId) {
    const directUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    return (
      <div className="my-6 space-y-3">
        {/* Embedded player: shows preview in an iframe (works for most file types) */}
        <div className="rounded-xl overflow-hidden bg-black aspect-video">
          <iframe
            src={previewUrl}
            className="w-full h-full"
            allow="autoplay"
            allowFullScreen
            title="Video dari Google Drive"
          />
        </div>
        {/* Fallback video tag — directly streams the video file */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          className="w-full rounded-xl"
          preload="metadata"
        >
          <source src={directUrl} type="video/mp4" />
          <source src={directUrl} type="video/webm" />
          <source src={directUrl} type="video/ogg" />
          Browser tidak mendukung pemutaran video.
        </video>
        <p className="text-xs text-[#5C7A6E] text-center">
          Jika video tidak muncul,{' '}
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1F3D30] underline font-medium"
          >
            buka langsung di Google Drive
          </a>
        </p>
      </div>
    );
  }

  // Generic URL — try rendering as iframe embed
  return (
    <div className="my-6 rounded-xl overflow-hidden bg-black aspect-video">
      <iframe
        src={url}
        className="w-full h-full"
        allow="autoplay"
        allowFullScreen
        title="Video"
      />
    </div>
  );
}
