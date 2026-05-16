import { Mail, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { TeamContact } from '@/lib/types'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('team_contacts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const contacts = (data ?? []) as TeamContact[]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Who to Contact</p>
        <h1 className="text-3xl font-serif text-white">Team Directory</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-2xl">
          When you have questions, route them to the right person — saves time and keeps things moving.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contacts.map(c => (
          <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-white font-semibold">{c.name}</h3>
              {c.office && (
                <span className="inline-flex items-center text-[11px] text-gray-500">
                  <MapPin className="w-3 h-3 mr-1" />{c.office}
                </span>
              )}
            </div>
            <p className="text-xs text-amber-500 uppercase tracking-wider mb-3">{c.role}</p>
            <p className="text-sm text-gray-300 leading-relaxed mb-3">{c.description}</p>
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="inline-flex items-center text-xs text-amber-500 hover:underline"
              >
                <Mail className="w-3 h-3 mr-1.5" />{c.email}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
