export default function YouTubeEmbed({ url }: { url: string | null }) {
  if (!url) return null;
  const videoId = url.includes('youtube.com/watch?v=')
    ? url.split('v=')[1]?.split('&')[0]
    : url.includes('youtu.be/')
    ? url.split('youtu.be/')[1]?.split('?')[0]
    : null;
  if (!videoId) return null;
  return (
    <div className="my-6 rounded-xl overflow-hidden bg-black aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video Pembelajaran"
      />
    </div>
  );
}
