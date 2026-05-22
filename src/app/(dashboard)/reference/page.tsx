import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ReferenceDoc } from '@/lib/types'

export default async function ReferencePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reference_docs')
    .select('*')
    .order('sort_order')

  const docs = (data ?? []) as ReferenceDoc[]
  const byCategory = docs.reduce<Record<string, ReferenceDoc[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d)
    return acc
  }, {})

  const CATEGORY_LABEL: Record<string, string> = {
    compensation: 'Compensation',
    services:     'Services & Add-Ons',
    process:      'Process Guides',
    checklist:    'Contract Checklists',
    training:     'Training & Resources',
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Knowledge Base</p>
        <h1 className="text-3xl font-serif text-white">Reference Library</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-2xl">
          Everything from the LRE onboarding packet, available anytime you need it.
        </p>
      </div>

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat}>
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
            {CATEGORY_LABEL[cat] ?? cat}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(doc => (
              <Link
                key={doc.id}
                href={`/reference/${doc.slug}`}
                className="group flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-5 transition-colors"
              >
                <span className="text-white text-sm font-medium">{doc.title}</span>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
