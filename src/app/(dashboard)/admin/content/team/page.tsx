import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TeamEditor from './TeamEditor'
import type { TeamContact } from '@/lib/types'

export default async function TeamContentPage() {
  await requireRole(['admin'])
  const supabase = await createClient()
  const { data } = await supabase.from('team_contacts').select('*').order('sort_order')
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin/content" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Manage Content
      </Link>
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Admin Only</p>
        <h1 className="text-3xl font-serif text-white">Team Directory Editor</h1>
        <p className="text-gray-400 text-sm mt-2">
          What agents see in the Team tab. Inactive contacts are hidden from agents but kept in the database.
        </p>
      </div>
      <TeamEditor initial={(data ?? []) as TeamContact[]} />
    </div>
  )
}
