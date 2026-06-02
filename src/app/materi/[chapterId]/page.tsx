import ChapterClient from './ChapterClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function generateStaticParams() {
  // Fetch all chapter IDs from Supabase at build time so new chapters
  // created by teachers get their own static page after the next deploy.
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chapters?select=id`,
      { headers: { apikey: SUPABASE_KEY!, 'Content-Type': 'application/json' } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { id: string }[] = await res.json();
    return data.map(({ id }) => ({ chapterId: id }));
  } catch {
    // Fallback to known chapters if Supabase is unreachable at build time
    return [
      { chapterId: 'bab-1' }, { chapterId: 'bab-2' }, { chapterId: 'bab-3' },
      { chapterId: 'bab-4' }, { chapterId: 'bab-5' }, { chapterId: 'bab-6' },
    ];
  }
}

export default function ChapterPage() {
  return <ChapterClient />;
}
