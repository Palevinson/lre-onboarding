'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Check, AlertCircle, KeyRound, User, Globe,
  Instagram, Facebook, Linkedin, Youtube,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SocialLinks = {
  instagram?: string
  facebook?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
  x?: string
}

type Props = {
  profileId: string
  initialFullName: string
  initialTitle: string
  initialLicense: string
  initialPhone: string
  initialTeam: string
  initialWebsite: string
  initialBio: string
  initialSocials: SocialLinks
}

export default function SettingsForms(props: Props) {
  return (
    <div className="space-y-6">
      <ProfileForm {...props} />
      <PublicProfileForm
        profileId={props.profileId}
        initialBio={props.initialBio}
        initialSocials={props.initialSocials}
      />
      <PasswordForm />
    </div>
  )
}

// ============================================================================
// Basic profile (name, phone, team, website, license) — unchanged behavior
// ============================================================================
function ProfileForm({
  profileId,
  initialFullName,
  initialTitle,
  initialLicense,
  initialPhone,
  initialTeam,
  initialWebsite,
}: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [title, setTitle] = useState(initialTitle)
  const [license, setLicense] = useState(initialLicense)
  const [phone, setPhone] = useState(initialPhone)
  const [team, setTeam] = useState(initialTeam)
  const [website, setWebsite] = useState(initialWebsite)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedJust, setSavedJust] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        title: title.trim() || null,
        license_number: license.trim() || null,
        phone: phone.trim() || null,
        team_name: team.trim() || null,
        website_url: website.trim() || null,
      })
      .eq('id', profileId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setSavedJust(true)
    setTimeout(() => setSavedJust(false), 2500)
    fetch('/api/website-sync', { method: 'POST' }).catch(() => {})
    router.refresh()
  }

  return (
    <form onSubmit={save} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-1">
        <User className="w-4 h-4 text-amber-500" />
        <h2 className="text-white font-semibold">Profile</h2>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {savedJust && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> Saved
        </div>
      )}
      <Field label="Full Name">
        <Input value={fullName} onChange={setFullName} placeholder="Jane Doe" />
      </Field>
      <Field label="Title">
        <Input value={title} onChange={setTitle} placeholder="e.g. REALTOR®, Broker, Team Lead" />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={setPhone} placeholder="(405) 555-0134" />
      </Field>
      <Field label="Team Name">
        <Input value={team} onChange={setTeam} placeholder="Optional — if you're on a team" />
      </Field>
      <Field label="Website">
        <Input value={website} onChange={setWebsite} placeholder="Optional — yoursite.com" />
      </Field>
      <Field label="License Number">
        <Input value={license} onChange={setLicense} placeholder="Optional" />
      </Field>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Your name, photo, phone, email, team, and website appear on your public LRE Realty profile
        page. Changes here update it automatically.
      </p>
      <button
        type="submit"
        disabled={saving}
        className="bg-amber-500 text-black font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Profile'}
      </button>
    </form>
  )
}

// ============================================================================
// Public Profile — bio + social media links (syncs to the LRE Realty website)
// ============================================================================
type SocialField = {
  key: keyof SocialLinks
  label: string
  icon: React.ReactNode
  placeholder: string
  prefix: string  // used when a bare handle is entered
}

const SOCIAL_FIELDS: SocialField[] = [
  { key: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, placeholder: 'instagram.com/yourname', prefix: 'https://instagram.com/' },
  { key: 'facebook',  label: 'Facebook',  icon: <Facebook  className="w-4 h-4" />, placeholder: 'facebook.com/yourname',  prefix: 'https://facebook.com/'  },
  { key: 'linkedin',  label: 'LinkedIn',  icon: <Linkedin  className="w-4 h-4" />, placeholder: 'linkedin.com/in/yourname', prefix: 'https://linkedin.com/in/' },
  { key: 'youtube',   label: 'YouTube',   icon: <Youtube   className="w-4 h-4" />, placeholder: 'youtube.com/@yourname',  prefix: 'https://youtube.com/@' },
  { key: 'tiktok',    label: 'TikTok',    icon: <TikTokGlyph />,                    placeholder: 'tiktok.com/@yourname',   prefix: 'https://tiktok.com/@'   },
  { key: 'x',         label: 'X (Twitter)', icon: <XGlyph />,                       placeholder: 'x.com/yourname',         prefix: 'https://x.com/'         },
]

const BIO_MAX = 600

function PublicProfileForm({
  profileId,
  initialBio,
  initialSocials,
}: {
  profileId: string
  initialBio: string
  initialSocials: SocialLinks
}) {
  const router = useRouter()
  const [bio, setBio] = useState(initialBio)
  const [socials, setSocials] = useState<SocialLinks>(initialSocials)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedJust, setSavedJust] = useState(false)

  const setSocial = (key: keyof SocialLinks, value: string) => {
    setSocials(prev => ({ ...prev, [key]: value }))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')

    // Normalize each social entry: trim, drop blanks, add https:// if user typed a bare host
    const normalized: SocialLinks = {}
    for (const f of SOCIAL_FIELDS) {
      const raw = (socials[f.key] ?? '').trim()
      if (!raw) continue
      normalized[f.key] = normalizeUrl(raw)
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        social_links: normalized,
      })
      .eq('id', profileId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setSocials(normalized)
    setSavedJust(true)
    setTimeout(() => setSavedJust(false), 2500)
    // Fire-and-forget push to the public site
    fetch('/api/website-sync', { method: 'POST' }).catch(() => {})
    router.refresh()
  }

  const bioLeft = BIO_MAX - bio.length

  return (
    <form onSubmit={save} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-1">
        <Globe className="w-4 h-4 text-amber-500" />
        <h2 className="text-white font-semibold">Public Profile</h2>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed -mt-1">
        Optional. Whatever you enter here appears on your LRE Realty profile page. Leave blank to omit.
      </p>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {savedJust && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> Saved
        </div>
      )}

      <Field label="Bio">
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
          rows={5}
          placeholder="Tell buyers and sellers a little about yourself — your background, what you love about Oklahoma real estate, how you like to work with clients."
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none resize-y leading-relaxed"
        />
        <div className={`text-[11px] mt-1 text-right ${bioLeft < 50 ? 'text-amber-500' : 'text-gray-500'}`}>
          {bioLeft} characters left
        </div>
      </Field>

      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">Social Media</label>
        <div className="space-y-2">
          {SOCIAL_FIELDS.map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                {f.icon}
              </div>
              <Input
                value={socials[f.key] ?? ''}
                onChange={v => setSocial(f.key, v)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed mt-2">
          You can paste a full URL or just the handle — we&apos;ll fix the format when you save.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-amber-500 text-black font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Public Profile'}
      </button>
    </form>
  )
}

// ============================================================================
// Password (unchanged)
// ============================================================================
function PasswordForm() {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) { setError('Password must be at least 8 characters'); return }
    if (next !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (error) { setError(error.message); return }
    setNext(''); setConfirm('')
    setDone(true)
    setTimeout(() => setDone(false), 4000)
  }

  return (
    <form onSubmit={save} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-1">
        <KeyRound className="w-4 h-4 text-amber-500" />
        <h2 className="text-white font-semibold">Change Password</h2>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {done && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> Password updated successfully
        </div>
      )}
      <Field label="New Password">
        <Input type="password" value={next} onChange={setNext} placeholder="At least 8 characters" />
      </Field>
      <Field label="Confirm New Password">
        <Input type="password" value={confirm} onChange={setConfirm} />
      </Field>
      <button
        type="submit"
        disabled={saving || !next || !confirm}
        className="bg-amber-500 text-black font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update Password'}
      </button>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Tip: if you were invited with a temporary password, change it here as soon as you sign in.
      </p>
    </form>
  )
}

// ============================================================================
// Shared UI helpers
// ============================================================================
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

// Lucide doesn't ship a TikTok or X icon in the version pinned to this project;
// tiny inline SVGs keep the visual language consistent with the rest of the row.
function TikTokGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M16.5 3a5.4 5.4 0 0 0 4.4 4.4v3.1a8.4 8.4 0 0 1-4.4-1.3v6.9a6.2 6.2 0 1 1-6.2-6.2c.3 0 .6 0 .9.1v3.2a3.1 3.1 0 1 0 2.2 3V3h3.1z" />
    </svg>
  )
}
function XGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M17.5 3h3.1l-6.8 7.7L22 21h-6.3l-4.9-6.5L5 21H1.9l7.3-8.3L1.6 3H8l4.4 5.9L17.5 3zm-1.1 16h1.7L7.8 5H6l10.4 14z" />
    </svg>
  )
}

// ============================================================================
// URL normalization: accept full URLs, bare hosts, or bare @handles.
// ============================================================================
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  // Already a URL with scheme
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  // Looks like a URL missing the scheme (has a dot before any slash)
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed)) return 'https://' + trimmed.replace(/^\/*/, '')

  // Otherwise treat as a bare handle — leave it alone; the URL prefix per platform
  // gets rendered by the website when it displays the profile.
  return trimmed
}
