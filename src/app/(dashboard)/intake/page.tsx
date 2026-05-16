import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import IntakeForm from '@/components/IntakeForm'
import type { AgentIntake } from '@/lib/types'

export default async function IntakePage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { data } = await supabase
    .from('agent_intake')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle()

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Onboarding</p>
        <h1 className="text-3xl font-serif text-white">Intake Forms</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-2xl leading-relaxed">
          The Agent Survey + Personal Info from your onboarding packet, all in one place.
          Save anytime — you can keep editing after you submit.
        </p>
      </div>

      <IntakeForm
        profileId={profile.id}
        profileEmail={profile.email}
        profileFullName={profile.full_name}
        initial={data as AgentIntake | null}
      />
    </div>
  )
}
