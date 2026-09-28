import { requireProfile } from '@/lib/auth'
import SettingsForms from './SettingsForms'

export default async function SettingsPage() {
  const profile = await requireProfile()
  // Public-profile columns added for the website sync (not in the base Profile type).
  const p = profile as typeof profile & {
    phone?: string | null
    team_name?: string | null
    website_url?: string | null
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Account</p>
        <h1 className="text-3xl font-serif text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-2">
          Signed in as <span className="text-white">{profile.email}</span>{' · '}
          <span className="text-amber-500 capitalize">{profile.role}</span>
        </p>
      </div>
      <SettingsForms
        profileId={profile.id}
        initialFullName={profile.full_name ?? ''}
        initialLicense={profile.license_number ?? ''}
        initialPhone={p.phone ?? ''}
        initialTeam={p.team_name ?? ''}
        initialWebsite={p.website_url ?? ''}
      />
    </div>
  )
}
