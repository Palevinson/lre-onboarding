'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, AlertCircle, GripVertical, Eye, EyeOff, Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TeamContact } from '@/lib/types'

type Draft = Partial<TeamContact>

export default function TeamEditor({ initial }: { initial: TeamContact[] }) {
  const router = useRouter()
  const [contacts, setContacts] = useState<TeamContact[]>(initial)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>({ sort_order: 100, is_active: true })

  const refresh = () => router.refresh()

  const updateField = async (id: string, field: keyof TeamContact, value: unknown) => {
    setSavingId(id)
    setError('')
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } as TeamContact : c))
    const supabase = createClient()
    const { error } = await supabase.from('team_contacts').update({ [field]: value }).eq('id', id)
    setSavingId(null)
    if (error) { setError(error.message); refresh() }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    const supabase = createClient()
    const { error } = await supabase.from('team_contacts').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setContacts(prev => prev.filter(c => c.id !== id))
    refresh()
  }

  const add = async () => {
    setError('')
    if (!draft.name?.trim() || !draft.role?.trim() || !draft.description?.trim()) {
      setError('Name, role, and description are required')
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase.from('team_contacts').insert({
      sort_order: draft.sort_order ?? 100,
      name: draft.name!.trim(),
      role: draft.role!.trim(),
      email: draft.email?.trim() || null,
      office: draft.office?.trim() || null,
      description: draft.description!.trim(),
      is_active: true,
    }).select().single()
    if (error) { setError(error.message); return }
    setContacts(prev => [...prev, data as TeamContact])
    setDraft({ sort_order: (draft.sort_order ?? 100) + 10, is_active: true })
    setAdding(false)
    refresh()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="space-y-2">
        {contacts.sort((a, b) => a.sort_order - b.sort_order).map(c => (
          <Row
            key={c.id}
            contact={c}
            saving={savingId === c.id}
            onChange={(f, v) => updateField(c.id, f, v)}
            onDelete={() => remove(c.id)}
          />
        ))}
      </div>

      {adding ? (
        <div className="bg-gray-900 border-2 border-amber-500/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">New Team Contact</h3>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
          <Input placeholder="Name (required)" value={draft.name ?? ''} onChange={v => setDraft(d => ({ ...d, name: v }))} />
          <Input placeholder="Role / Title (required)" value={draft.role ?? ''} onChange={v => setDraft(d => ({ ...d, role: v }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Email" type="email" value={draft.email ?? ''} onChange={v => setDraft(d => ({ ...d, email: v }))} />
            <Input placeholder="Office (e.g. Office 36)" value={draft.office ?? ''} onChange={v => setDraft(d => ({ ...d, office: v }))} />
          </div>
          <Textarea placeholder="What to contact them about (required)" value={draft.description ?? ''} onChange={v => setDraft(d => ({ ...d, description: v }))} />
          <Input placeholder="Sort order" type="number" value={draft.sort_order?.toString() ?? ''} onChange={v => setDraft(d => ({ ...d, sort_order: v ? Number(v) : 100 }))} />
          <button onClick={add} className="w-full bg-amber-500 text-black font-semibold py-2 rounded-lg text-sm hover:bg-amber-400">
            Add Contact
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setAdding(true); setDraft({ sort_order: (contacts.at(-1)?.sort_order ?? 0) + 10, is_active: true }) }}
          className="w-full bg-gray-900 border-2 border-dashed border-gray-700 hover:border-amber-500/50 hover:text-amber-500 text-gray-400 rounded-xl p-4 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      )}
    </div>
  )
}

function Row({
  contact, saving, onChange, onDelete,
}: {
  contact: TeamContact; saving: boolean;
  onChange: (field: keyof TeamContact, value: unknown) => void;
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl ${!contact.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2 p-3">
        <GripVertical className="w-4 h-4 text-gray-700 mt-2 shrink-0" />
        <input
          type="number"
          value={contact.sort_order}
          onChange={e => onChange('sort_order', Number(e.target.value))}
          className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 shrink-0"
        />
        <PhotoUploader
          contact={contact}
          onChange={url => onChange('photo_url', url)}
        />
        <div className="flex-1 min-w-0">
          <input
            value={contact.name}
            onChange={e => onChange('name', e.target.value)}
            className="w-full bg-transparent text-sm text-white font-medium border-0 px-0 py-0.5 focus:outline-none"
          />
          <input
            value={contact.role}
            onChange={e => onChange('role', e.target.value)}
            className="w-full bg-transparent text-xs text-amber-500 uppercase tracking-wider border-0 px-0 py-0.5 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {saving && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
          <button
            onClick={() => onChange('is_active', !contact.is_active)}
            className="text-gray-500 hover:text-amber-500 p-1 rounded"
            title={contact.is_active ? 'Deactivate' : 'Activate'}
          >
            {contact.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setExpanded(e => !e)} className="text-[11px] text-gray-400 hover:text-amber-500 px-2 py-1 rounded">
            {expanded ? 'Hide' : 'Details'}
          </button>
          <button onClick={onDelete} className="text-gray-500 hover:text-red-400 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 p-3 space-y-3">
          <PhotoPicker contact={contact} onChange={url => onChange('photo_url', url)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Email" type="email" value={contact.email ?? ''} onChange={v => onChange('email', v || null)} />
            <Input placeholder="Office" value={contact.office ?? ''} onChange={v => onChange('office', v || null)} />
          </div>
          <Textarea
            placeholder="Description"
            value={contact.description}
            onChange={v => onChange('description', v)}
          />
        </div>
      )}
    </div>
  )
}

function PhotoPicker({ contact, onChange }: { contact: TeamContact; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) { setError('Image files only'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB'); return }
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${contact.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('team-photos').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('team-photos').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  const removePhoto = async () => {
    if (!contact.photo_url) return
    if (!confirm('Remove this photo?')) return
    onChange(null)
  }

  const initials = contact.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">Photo</label>
      <div className="flex items-center gap-4">
        {contact.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.photo_url}
            alt={contact.name}
            className="w-16 h-16 rounded-full object-cover border border-gray-700 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-black font-semibold flex items-center justify-center text-lg shrink-0">
            {initials || '?'}
          </div>
        )}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 bg-amber-500 text-black font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-amber-400 disabled:opacity-50"
            >
              {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : <><Camera className="w-3 h-3" /> {contact.photo_url ? 'Replace photo' : 'Upload photo'}</>}
            </button>
            {contact.photo_url && (
              <button
                type="button"
                onClick={removePhoto}
                className="text-xs text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/5"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500">JPG, PNG, or HEIC · Max 5 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) upload(file)
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
    </div>
  )
}

function PhotoUploader({ contact, onChange }: { contact: TeamContact; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) { setError('Image files only'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB'); return }
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${contact.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('team-photos').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('team-photos').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  const removePhoto = async () => {
    if (!contact.photo_url) return
    if (!confirm('Remove this photo?')) return
    onChange(null)
  }

  const initials = contact.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative w-10 h-10 rounded-full overflow-hidden border border-gray-700 hover:border-amber-500 transition-colors"
        title={contact.photo_url ? 'Change photo' : 'Upload photo'}
      >
        {contact.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-600 text-black flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
        </div>
      </button>
      {contact.photo_url && (
        <button
          type="button"
          onClick={removePhoto}
          className="absolute -top-1 -right-1 bg-gray-900 border border-gray-700 hover:border-red-400 hover:text-red-400 text-gray-400 rounded-full w-4 h-4 flex items-center justify-center"
          title="Remove photo"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) upload(file)
          e.target.value = ''
        }}
      />
      {error && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-red-500/95 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
    />
  )
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={2}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none resize-y"
    />
  )
}
