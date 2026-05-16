import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import IntakeForm from '@/components/IntakeForm'
import type { AgentIntake, IntakeQuestion } from '@/lib/types'

export default async function IntakePage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [intakeRes, questionsRes] = await Promise.all([
    supabase.from('agent_intake').select('*').eq('profile_id', profile.id).maybeSingle(),
    supabase.from('intake_questions').select('*').eq('is_active', true).order('section').order('sort_order'),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Onboarding</p>
        <h1 className="text-3xl font-serif text-white">Intake Form</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-2xl leading-relaxed">
          So your brokerage can get to know you better. Save anytime — you can keep editing after you submit.
        </p>
      </div>

      <IntakeForm
        profileId={profile.id}
        profileEmail={profile.email}
        profileFullName={profile.full_name}
        questions={(questionsRes.data ?? []) as IntakeQuestion[]}
        initial={intakeRes.data as AgentIntake | null}
      />
    </div>
  )
}
