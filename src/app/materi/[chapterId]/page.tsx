import ChapterClient from './ChapterClient';

export function generateStaticParams() {
  return [
    { chapterId: 'bab-1' }, { chapterId: 'bab-2' }, { chapterId: 'bab-3' },
    { chapterId: 'bab-4' }, { chapterId: 'bab-5' }, { chapterId: 'bab-6' },
  ];
}

export default function ChapterPage() {
  return <ChapterClient />;
}
