'use client';

import { ChapterMaterial } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import YouTubeEmbed from './YouTubeEmbed';
import MediaViewer from './MediaViewer';
import { useState } from 'react';

interface Props {
  materials: ChapterMaterial[];
  matProgress: Record<string, { viewed: boolean; viewedAt: string | null }>;
  materialStepDone: boolean;
  onMaterialDone: () => void;
}

function MaterialIcon({ type }: { type: ChapterMaterial['type'] }) {
  switch (type) {
    case 'text': return <span>📝</span>;
    case 'image': return <span>🖼️</span>;
    case 'video': return <span>🎬</span>;
    case 'embed': return <span>🔗</span>;
  }
}

function MaterialLabel({ type }: { type: ChapterMaterial['type'] }) {
  switch (type) {
    case 'text': return 'Bacaan';
    case 'image': return 'Gambar';
    case 'video': return 'Video';
    case 'embed': return 'Referensi';
  }
}

export default function ChapterContent({ materials, matProgress, materialStepDone, onMaterialDone }: Props) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState<string | null>(null);

  if (materials.length === 0) {
    return (
      <div className="ml-11 space-y-4">
        <div className="p-6 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5 text-center">
          <p className="text-sm text-[#5C7A6E]">Belum ada materi untuk bab ini.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ml-11 space-y-4">
        {materials.map((material, idx) => {
          const isViewed = matProgress[material.id]?.viewed;
          return (
            <div
              key={material.id}
              className={`rounded-xl border overflow-hidden transition-colors ${
                isViewed ? 'border-emerald-100 bg-white' : 'border-[#1F3D30]/5 bg-[#FBF8F4]'
              }`}
            >
              {/* Section header */}
              <div className={`flex items-center gap-2 px-4 py-2 border-b ${
                isViewed ? 'border-emerald-50 bg-emerald-50/30' : 'border-[#1F3D30]/5 bg-white/50'
              }`}>
                <MaterialIcon type={material.type} />
                <span className="text-xs font-semibold text-[#5C7A6E] uppercase tracking-wide">
                  {MaterialLabel({ type: material.type })} {idx + 1}
                </span>
                {isViewed && (
                  <span className="ml-auto text-[11px] font-medium text-emerald-600">✓ Dibaca</span>
                )}
              </div>

              {/* Section content */}
              <div className="p-4">
                {material.type === 'text' && (
                  <div className="prose prose-sm max-w-none prose-headings:text-[#1F3D30] prose-a:text-[#1F3D30]">
                    <ReactMarkdown>{material.content}</ReactMarkdown>
                  </div>
                )}

                {material.type === 'image' && (
                  <div>
                    <img
                      src={material.content}
                      alt={material.caption ?? 'Gambar'}
                      className="w-full max-h-80 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-[#1F3D30]/5"
                      onClick={() => {
                        setMediaUrl(material.content);
                        setMediaCaption(material.caption);
                      }}
                    />
                    {material.caption && (
                      <p className="text-xs text-[#5C7A6E] mt-2 text-center italic">{material.caption}</p>
                    )}
                  </div>
                )}

                {material.type === 'video' && (
                  <div>
                    <YouTubeEmbed url={material.content} />
                    {material.caption && (
                      <p className="text-xs text-[#5C7A6E] mt-2">{material.caption}</p>
                    )}
                  </div>
                )}

                {material.type === 'embed' && (
                  <div>
                    <a
                      href={material.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#1F3D30] font-medium hover:underline"
                    >
                      🔗 {material.caption || material.content}
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Mark as done button */}
        {!materialStepDone && (
          <button
            onClick={onMaterialDone}
            className="w-full py-3 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors"
          >
            ✓ Saya sudah selesai membaca materi
          </button>
        )}
        {materialStepDone && (
          <p className="text-sm text-emerald-700 font-medium text-center">✅ Materi sudah dibaca</p>
        )}
      </div>

      {/* Media viewer modal */}
      {mediaUrl && (
        <MediaViewer
          url={mediaUrl}
          caption={mediaCaption}
          onClose={() => {
            setMediaUrl(null);
            setMediaCaption(null);
          }}
        />
      )}
    </>
  );
}
