'use client';

import { ChapterMaterial } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import YouTubeEmbed from './YouTubeEmbed';
import MediaViewer from './MediaViewer';
import { useState } from 'react';

interface Props {
  chapterId?: string;
  materials: ChapterMaterial[];
  matProgress: Record<string, { viewed: boolean; viewedAt: string | null }>;
  materialStepDone: boolean;
  onMaterialDone: () => void;
  isTeacher?: boolean;
  onDeleteMaterial?: (materialId: string) => void;
  onCreateMaterial?: (data: { type: ChapterMaterial['type']; content: string; caption?: string | null }) => Promise<void>;
  onUpdateMaterial?: (materialId: string, data: { type: ChapterMaterial['type']; content: string; caption?: string | null }) => Promise<void>;
}

function MaterialIcon({ type }: { type: ChapterMaterial['type'] }) {
  switch (type) {
    case 'text': return <span>📝</span>;
    case 'image': return <span>🖼️</span>;
    case 'video': return <span>🎬</span>;
    case 'embed': return <span>🔗</span>;
    case 'file': return <span>📎</span>;
  }
}

function MaterialLabel({ type }: { type: ChapterMaterial['type'] }) {
  switch (type) {
    case 'text': return 'Bacaan';
    case 'image': return 'Gambar';
    case 'video': return 'Video';
    case 'embed': return 'Referensi';
    case 'file': return 'File';
  }
}

function MaterialForm({
  initialType = 'text',
  initialContent = '',
  initialCaption = '',
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialType?: ChapterMaterial['type'];
  initialContent?: string;
  initialCaption?: string;
  submitLabel: string;
  onSubmit: (data: { type: ChapterMaterial['type']; content: string; caption?: string | null }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [type, setType] = useState<ChapterMaterial['type']>(initialType);
  const [content, setContent] = useState(initialContent);
  const [caption, setCaption] = useState(initialCaption);
  const [saving, setSaving] = useState(false);

  const placeholder =
    type === 'text' ? 'Tulis isi materi markdown di sini...' :
    type === 'image' ? 'https://.../gambar.jpg' :
    type === 'video' ? 'https://youtube.com/watch?v=...' :
    'https://...';

  return (
    <div className="rounded-xl border border-[#1F3D30]/10 bg-white p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-[#5C7A6E] mb-1">Tipe</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ChapterMaterial['type'])}
            className="w-full px-3 py-2 border border-[#d4dcd0] rounded-xl text-sm bg-white"
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="embed">Embed/Link</option>
            <option value="file">File</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase text-[#5C7A6E] mb-1">Caption</label>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption opsional"
            className="w-full px-3 py-2 border border-[#d4dcd0] rounded-xl text-sm bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-[#5C7A6E] mb-1">Content</label>
        {type === 'file' ? (
          <div className="flex items-center gap-2 p-3 bg-[#FBF8F4] rounded-xl border border-dashed border-[#1F3D30]/20">
            <span className="text-lg">📎</span>
            <span className="text-sm text-[#5C7A6E]">Upload file belum tersedia (Gdrive Phase 2).</span>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={type === 'text' ? 10 : 4}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-[#d4dcd0] rounded-xl text-sm bg-white resize-y"
          />
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            if (!content.trim()) return;
            setSaving(true);
            await onSubmit({ type, content: content.trim(), caption: caption.trim() || null });
            setSaving(false);
          }}
          disabled={saving || !content.trim()}
          className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#f2f4f0] text-[#5C7A6E] rounded-xl text-sm font-semibold"
          >
            Batal
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChapterContent({
  chapterId,
  materials,
  matProgress,
  materialStepDone,
  onMaterialDone,
  isTeacher,
  onDeleteMaterial,
  onCreateMaterial,
  onUpdateMaterial,
}: Props) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="ml-11 space-y-4">
        {isTeacher && onCreateMaterial && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#1F3D30]/15 bg-[#FBF8F4] p-4">
            <div>
              <p className="text-sm font-semibold text-[#1F3D30]">Materi Bab</p>
              <p className="text-xs text-[#5C7A6E]">Tambah, edit, atau hapus isi bab langsung dari sini.</p>
            </div>
            <button
              onClick={() => setAdding((v) => !v)}
              className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold"
            >
              {adding ? 'Tutup Form' : '+ Tambah Materi'}
            </button>
          </div>
        )}

        {isTeacher && adding && onCreateMaterial && (
          <MaterialForm
            submitLabel="+ Simpan Materi"
            onSubmit={async (data) => {
              await onCreateMaterial(data);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}

        {materials.length === 0 && (
          <div className="p-6 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5 text-center">
            <p className="text-sm text-[#5C7A6E]">Belum ada materi untuk bab ini.</p>
          </div>
        )}

        {materials.map((material, idx) => {
          const isViewed = matProgress[material.id]?.viewed;
          const isEditing = editingId === material.id;

          return (
            <div
              key={material.id}
              className={`rounded-xl border overflow-hidden transition-colors ${
                isViewed ? 'border-emerald-100 bg-white' : 'border-[#1F3D30]/5 bg-[#FBF8F4]'
              }`}
            >
              <div className={`flex items-center gap-2 px-4 py-2 border-b ${
                isViewed ? 'border-emerald-50 bg-emerald-50/30' : 'border-[#1F3D30]/5 bg-white/50'
              }`}>
                <MaterialIcon type={material.type} />
                <span className="text-xs font-semibold text-[#5C7A6E] uppercase tracking-wide">
                  {MaterialLabel({ type: material.type })} {idx + 1}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {isTeacher && onUpdateMaterial && (
                    <button
                      onClick={() => setEditingId(isEditing ? null : material.id)}
                      className="text-[#1F3D30] hover:bg-[#1F3D30]/5 rounded-lg px-2 py-1 text-xs font-semibold transition-colors"
                      title="Edit materi"
                    >
                      {isEditing ? 'Tutup' : 'Edit'}
                    </button>
                  )}
                  {isTeacher && onDeleteMaterial && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Hapus materi ini?')) onDeleteMaterial(material.id); }}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-colors"
                      title="Hapus materi"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M3 3l8 8M11 3l-8 8" />
                      </svg>
                    </button>
                  )}
                  {!isTeacher && isViewed && (
                    <span className="text-[11px] font-medium text-emerald-600">✓ Dibaca</span>
                  )}
                </div>
              </div>

              <div className="p-4">
                {isTeacher && isEditing && onUpdateMaterial ? (
                  <MaterialForm
                    initialType={material.type}
                    initialContent={material.content}
                    initialCaption={material.caption ?? ''}
                    submitLabel="💾 Simpan Perubahan"
                    onSubmit={async (data) => {
                      await onUpdateMaterial(material.id, data);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
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

                    {material.type === 'file' && (
                      <div>
                        <div className="flex items-center gap-3 p-3 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5">
                          <span className="text-2xl">📎</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1F3D30] truncate">
                              {material.fileName || material.content || 'File'}
                            </p>
                            {material.fileSize && (
                              <p className="text-[10px] text-[#8A9E95]">
                                {(material.fileSize / 1024 / 1024).toFixed(1)} MB
                              </p>
                            )}
                          </div>
                          <a
                            href={material.fileUrl || material.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-[#1F3D30] text-white rounded-lg text-xs font-semibold hover:bg-[#2A5A44] transition-colors flex-shrink-0"
                          >
                            Buka
                          </a>
                        </div>
                        {material.caption && (
                          <p className="text-xs text-[#5C7A6E] mt-2">{material.caption}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {!isTeacher && !materialStepDone && materials.length > 0 && (
          <button
            onClick={onMaterialDone}
            className="w-full py-3 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors"
          >
            ✓ Saya sudah selesai membaca materi
          </button>
        )}
        {!isTeacher && materialStepDone && (
          <p className="text-sm text-emerald-700 font-medium text-center">✅ Materi sudah dibaca</p>
        )}
      </div>

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
