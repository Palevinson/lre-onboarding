'use client'
import { useRef, useState, useTransition } from 'react'
import { Check, Loader2, ExternalLink, Mail, Upload, FileText, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TaskTemplate } from '@/lib/types'

type Props = {
  template: TaskTemplate
  profileId: string
  initialDone: boolean
  initialUploadPath?: string | null
  initialUploadFilename?: string | null
  readOnly?: boolean
}

export default function TaskItem({
  template, profileId, initialDone,
  initialUploadPath = null, initialUploadFilename = null,
  readOnly,
}: Props) {
  const [done, setDone] = useState(initialDone)
  const [uploadPath, setUploadPath] = useState(initialUploadPath)
  const [uploadFilename, setUploadFilename] = useState(initialUploadFilename)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = async (e: React.MouseEvent) => {
    // Don't toggle if click came from inside an interactive child (a, button)
    if ((e.target as HTMLElement).closest('a, button, [data-no-toggle]')) return
    if (readOnly || saving) return
    const next = !done
    setDone(next)
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('task_completions').upsert({
        profile_id: profileId,
        template_id: template.id,
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      }, { onConflict: 'profile_id,template_id' })
      if (error) {
        setDone(!next)
        setError(error.message)
      }
    } finally {
      setSaving(false)
      startTransition(() => {})
    }
  }

  return (
    <div
      onClick={toggle}
      className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
        readOnly ? 'cursor-default' : 'cursor-pointer hover:border-amber-500/40'
      } ${
        done ? 'bg-gray-900/40 border-gray-800' : 'bg-gray-900 border-gray-800'
      }`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
        done ? 'bg-amber-500 border-amber-500' : 'border-2 border-gray-600 group-hover:border-amber-500/60'
      }`}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin text-gray-300" /> :
         done ? <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-white'}`}>
            {template.title}
          </span>
          {template.is_optional && (
            <span className="text-[10px] uppercase tracking-wider text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Optional
            </span>
          )}
          {template.cost_note && (
            <span className="text-[11px] text-gray-400">· {template.cost_note}</span>
          )}
          {template.owner_hint && (
            <span className="text-[11px] text-gray-500">· {template.owner_hint}</span>
          )}
        </div>
        {template.description && (
          <p className={`text-xs mt-1 leading-relaxed ${done ? 'text-gray-600' : 'text-gray-400'}`}>
            {template.description}
          </p>
        )}
        {template.actions && template.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {template.actions.map((a, i) => (
              <ActionButton key={i} url={a.url} label={a.label} done={done} />
            ))}
          </div>
        )}
        {template.allow_upload && (
          <FileSlot
            profileId={profileId}
            templateId={template.id}
            label={template.upload_label}
            uploadPath={uploadPath}
            uploadFilename={uploadFilename}
            onChange={(path, filename) => { setUploadPath(path); setUploadFilename(filename) }}
            readOnly={readOnly}
          />
        )}
        {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  )
}

function ActionButton({ url, label, done }: { url: string; label: string; done: boolean }) {
  const isMail = url.startsWith('mailto:')
  const isInternal = url.startsWith('/')
  const Icon = isMail ? Mail : ExternalLink
  const text = label || (isMail ? 'Send email' : isInternal ? 'Open' : 'Open link')

  return (
    <a
      href={url}
      target={isMail || isInternal ? undefined : '_blank'}
      rel={isMail || isInternal ? undefined : 'noopener noreferrer'}
      onClick={e => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        done
          ? 'bg-gray-800/60 text-gray-500 hover:text-amber-500'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black'
      }`}
    >
      <Icon className="w-3 h-3" />
      {text}
    </a>
  )
}

function FileSlot({
  profileId, templateId, label, uploadPath, uploadFilename, onChange, readOnly,
}: {
  profileId: string
  templateId: string
  label: string | null
  uploadPath: string | null
  uploadFilename: string | null
  onChange: (path: string | null, filename: string | null) => void
  readOnly?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const promptText = label || 'Upload proof'

  const openFile = async () => {
    if (!uploadPath) return
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('task-uploads').createSignedUrl(uploadPath, 60 * 30)
    if (error || !data) { setErr(error?.message ?? 'Could not open file'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const upload = async (file: File) => {
    setErr('')
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) { setErr('Only images and PDFs'); return }
    if (file.size > 10 * 1024 * 1024) { setErr('Max 10 MB'); return }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase()
      const path = `${profileId}/${templateId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('task-uploads').upload(path, file, { upsert: true })
      if (upErr) { setErr(upErr.message); return }
      const { error: dbErr } = await supabase.from('task_completions').upsert({
        profile_id: profileId,
        template_id: templateId,
        upload_path: path,
        upload_filename: file.name,
        upload_uploaded_at: new Date().toISOString(),
      }, { onConflict: 'profile_id,template_id' })
      if (dbErr) { setErr(dbErr.message); return }
      onChange(path, file.name)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = async () => {
    if (!uploadPath) return
    if (!confirm('Remove this uploaded file?')) return
    setUploading(true)
    setErr('')
    try {
      const supabase = createClient()
      await supabase.storage.from('task-uploads').remove([uploadPath])
      const { error } = await supabase.from('task_completions').upsert({
        profile_id: profileId,
        template_id: templateId,
        upload_path: null,
        upload_filename: null,
        upload_uploaded_at: null,
      }, { onConflict: 'profile_id,template_id' })
      if (error) { setErr(error.message); return }
      onChange(null, null)
    } finally {
      setUploading(false)
    }
  }

  // Has a file → show filename + view button
  if (uploadPath && uploadFilename) {
    return (
      <div className="mt-2 flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2" data-no-toggle>
        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-xs text-gray-200 truncate flex-1">{uploadFilename}</span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); openFile() }}
          className="text-xs text-amber-500 hover:underline font-medium shrink-0"
        >
          View
        </button>
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
              className="text-xs text-gray-400 hover:text-amber-500 shrink-0"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeFile() }}
              className="text-gray-500 hover:text-red-400 shrink-0"
              title="Remove file"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) upload(f)
            e.target.value = ''
          }}
        />
        {err && <p className="text-[11px] text-red-400 ml-2">{err}</p>}
      </div>
    )
  }

  // No file yet — agents see upload button, admins viewing readOnly see "Not uploaded"
  if (readOnly) {
    return (
      <p className="text-[11px] text-gray-500 mt-2 italic">Not uploaded yet</p>
    )
  }

  return (
    <div className="mt-2" data-no-toggle>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-dashed border-gray-600 hover:border-amber-500/60 text-gray-300 hover:text-amber-500 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
      >
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {uploading ? 'Uploading…' : promptText}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }}
      />
      {err && <p className="text-[11px] text-red-400 mt-1">{err}</p>}
    </div>
  )
}
