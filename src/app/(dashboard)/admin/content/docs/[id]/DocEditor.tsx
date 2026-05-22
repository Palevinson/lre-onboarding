'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Check, Trash2, Eye, Pencil, Upload, FileText, X, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ReferenceDoc } from '@/lib/types'

const CATEGORIES = ['compensation', 'services', 'process', 'checklist', 'training']

export default function DocEditor({ initial }: { initial: ReferenceDoc | null }) {
  const router = useRouter()
  const isNew = !initial
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'process')
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 100)
  const [content, setContent] = useState(initial?.content ?? '')
  const [filePath, setFilePath] = useState<string | null>(initial?.file_path ?? null)
  const [fileFilename, setFileFilename] = useState<string | null>(initial?.file_filename ?? null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initial?.thumbnail_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  const save = async () => {
    setSaving(true)
    setError('')
    const supabase = createClient()
    if (isNew) {
      if (!title.trim() || !slug.trim() || !content.trim()) {
        setError('Title, slug, and content are required')
        setSaving(false); return
      }
      const { data, error } = await supabase.from('reference_docs').insert({
        title: title.trim(),
        slug: slug.trim(),
        category,
        sort_order: sortOrder,
        content,
        file_path: filePath,
        file_filename: fileFilename,
        thumbnail_url: thumbnailUrl,
      }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      router.push(`/admin/content/docs/${(data as ReferenceDoc).id}`)
    } else {
      const { error } = await supabase.from('reference_docs').update({
        title: title.trim(),
        slug: slug.trim(),
        category,
        sort_order: sortOrder,
        content,
        file_path: filePath,
        file_filename: fileFilename,
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', initial!.id)
      setSaving(false)
      if (error) { setError(error.message); return }
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
      router.refresh()
    }
  }

  const remove = async () => {
    if (!initial) return
    if (!confirm(`Delete "${initial.title}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('reference_docs').delete().eq('id', initial.id)
    if (error) { setError(error.message); return }
    router.push('/admin/content/docs')
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {justSaved && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" /> Saved
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title">
            <Input value={title} onChange={setTitle} />
          </Field>
          <Field label="Slug (URL path)">
            <Input value={slug} onChange={setSlug} placeholder="e.g. compensation" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors capitalize ${
                    category === c
                      ? 'bg-amber-500 text-black border-amber-500 font-semibold'
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Sort order">
            <Input type="number" value={String(sortOrder)} onChange={v => setSortOrder(Number(v) || 100)} />
          </Field>
        </div>
      </div>

      {/* Thumbnail / cover image */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">Thumbnail / Cover Image (Optional)</label>
        <div className="flex items-center gap-4">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="Cover" className="w-16 h-20 object-cover rounded border border-gray-700 shrink-0" />
          ) : (
            <div className="w-16 h-20 rounded border border-dashed border-gray-700 bg-gray-800/50 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-gray-600" />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                disabled={uploadingThumb || isNew}
                title={isNew ? 'Save the doc first, then add a thumbnail' : 'Upload a cover / thumbnail'}
                className="inline-flex items-center gap-1.5 bg-amber-500 text-black font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploadingThumb ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploadingThumb ? 'Uploading…' : (thumbnailUrl ? 'Replace' : 'Upload')}
              </button>
              {thumbnailUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Remove the thumbnail?')) return
                    // We don't strictly need to delete from storage — replacing later upserts.
                    setThumbnailUrl(null)
                  }}
                  className="text-xs text-gray-400 hover:text-red-400 px-2 py-1.5"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">JPG, PNG, or HEIC · Max 5 MB · Public (anyone with the URL can view)</p>
          </div>
        </div>
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (!file.type.startsWith('image/')) { setError('Image files only'); return }
            if (file.size > 5 * 1024 * 1024) { setError('Thumbnail max 5 MB'); return }
            if (!initial) { setError('Save the doc first, then upload a thumbnail'); return }
            setError('')
            setUploadingThumb(true)
            const supabase = createClient()
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
            const path = `${initial.id}/${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('reference-thumbnails')
              .upload(path, file, { upsert: true, contentType: file.type || undefined })
            if (upErr) { setError(upErr.message); setUploadingThumb(false); return }
            const { data: pub } = supabase.storage.from('reference-thumbnails').getPublicUrl(path)
            setThumbnailUrl(pub.publicUrl)
            setUploadingThumb(false)
          }}
        />
      </div>

      {/* Attached file (PDF / EPUB) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">Downloadable File (Optional)</label>
        {filePath && fileFilename ? (
          <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2">
            <FileText className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-gray-200 truncate flex-1">{fileFilename}</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || isNew}
              className="text-xs text-gray-400 hover:text-amber-500"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Remove this file? Agents will no longer be able to download it.')) return
                if (filePath) {
                  const supabase = createClient()
                  await supabase.storage.from('reference-files').remove([filePath])
                }
                setFilePath(null)
                setFileFilename(null)
              }}
              className="text-gray-500 hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isNew}
            title={isNew ? 'Save the doc first, then attach a file' : 'Upload a PDF or EPUB'}
            className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-dashed border-gray-600 hover:border-amber-500/60 text-gray-300 hover:text-amber-500 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {uploading ? 'Uploading…' : 'Upload PDF / EPUB'}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,application/epub+zip,.pdf,.epub"
          className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (file.size > 50 * 1024 * 1024) { setError('Max file size is 50 MB'); return }
            if (!initial) { setError('Save the doc first, then upload a file'); return }
            setError('')
            setUploading(true)
            const supabase = createClient()
            const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
            const path = `${initial.id}/${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('reference-files')
              .upload(path, file, { upsert: true, contentType: file.type || undefined })
            if (upErr) { setError(upErr.message); setUploading(false); return }
            // If there was a previous file, remove it
            if (filePath && filePath !== path) {
              await supabase.storage.from('reference-files').remove([filePath])
            }
            setFilePath(path)
            setFileFilename(file.name)
            setUploading(false)
          }}
        />
        <p className="text-[11px] text-gray-500 mt-2">PDF or EPUB · Max 50 MB · Only signed-in agents can download — files are not publicly accessible.</p>
      </div>

      {/* Edit / Preview tabs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
          <div className="inline-flex bg-gray-800/50 rounded-lg p-1">
            <TabBtn active={tab === 'edit'} onClick={() => setTab('edit')} icon={<Pencil className="w-3 h-3" />}>Edit</TabBtn>
            <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')} icon={<Eye className="w-3 h-3" />}>Preview</TabBtn>
          </div>
          <span className="text-[10px] text-gray-500">Markdown — ## H2, ### H3, **bold**, - bullets, &gt; quote</span>
        </div>
        {tab === 'edit' ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={20}
            className="w-full bg-transparent text-white px-4 py-3 text-sm focus:outline-none resize-y font-mono leading-relaxed"
            placeholder="## Section Heading&#10;&#10;Paragraph text…&#10;&#10;- Bullet item&#10;- Another bullet"
          />
        ) : (
          <div className="px-4 py-3 min-h-[300px]">{renderMarkdown(content)}</div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {!isNew && (
            <button
              onClick={remove}
              className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium py-2 px-3 rounded-lg hover:bg-red-500/5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-amber-500 text-black font-semibold py-2.5 px-6 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : (isNew ? 'Create Document' : 'Save Changes')}
        </button>
      </div>
    </div>
  )
}

// === UI primitives ===
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
    />
  )
}
function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
        active ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon} {children}
    </button>
  )
}

// === Markdown renderer (matches what agents see) ===
function renderMarkdown(md: string): React.ReactNode[] {
  if (!md.trim()) return [<p key="empty" className="text-gray-500 text-sm italic">Nothing to preview yet.</p>]
  const lines = md.split('\n')
  const nodes: React.ReactNode[] = []
  let listBuffer: string[] = []
  const flushList = () => {
    if (!listBuffer.length) return
    nodes.push(
      <ul key={nodes.length} className="list-disc list-outside ml-5 space-y-1 my-3 text-gray-300">
        {listBuffer.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />)}
      </ul>
    )
    listBuffer = []
  }
  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-amber-300 rounded px-1.5 py-0.5 text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-amber-500 hover:underline" href="$2">$1</a>')

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flushList(); continue }
    if (line.startsWith('### ')) {
      flushList()
      nodes.push(<h3 key={nodes.length} className="text-white text-base font-semibold mt-5 mb-2">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      flushList()
      nodes.push(<h2 key={nodes.length} className="text-amber-500 text-xs uppercase tracking-widest font-semibold mt-6 mb-3">{line.slice(3)}</h2>)
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
    } else if (line.startsWith('> ')) {
      flushList()
      nodes.push(
        <blockquote key={nodes.length} className="border-l-2 border-amber-500/60 pl-4 my-4 text-amber-100/80 italic">
          <span dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }} />
        </blockquote>
      )
    } else {
      flushList()
      nodes.push(
        <p key={nodes.length} className="text-gray-300 text-sm leading-relaxed my-3"
           dangerouslySetInnerHTML={{ __html: inline(line) }} />
      )
    }
  }
  flushList()
  return nodes
}
