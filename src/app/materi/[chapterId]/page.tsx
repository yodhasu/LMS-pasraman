import ChapterClient from './ChapterClient';

// Generate pages for known chapters. New chapters created after build
// are served by the hosting provider
// ChapterClient handling the data load client-side.
export async function generateStaticParams() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/chapters?select=id`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json' } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { id: string }[] = await res.json();
    return data.map(({ id }) => ({ chapterId: id }));
  } catch {
    // Fallback if Supabase unreachable at build time
    return [
      { chapterId: 'bab-1' }, { chapterId: 'bab-2' }, { chapterId: 'bab-3' },
      { chapterId: 'bab-4' }, { chapterId: 'bab-5' }, { chapterId: 'bab-6' },
    ];
  }
}

export default async function ChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  return <ChapterClient key={chapterId} />;
}
