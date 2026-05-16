import Link from 'next/link'
import { ChevronLeft, ArrowRight, Plus } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { ReferenceDoc } from '@/lib/types'

export default async function DocsListPage() {
  await requireRole(['admin'])
  const supabase = await createClient()
  const { data } = await supabase.from('reference_docs').select('*').order('category').order('sort_order')
  const docs = (data ?? []) as ReferenceDoc[]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin/content" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Manage Content
      </Link>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Admin Only</p>
          <h1 className="text-3xl font-serif text-white">Reference Library</h1>
          <p className="text-gray-400 text-sm mt-2 max-w-xl">
            Edit the documents agents see under the Reference tab. Markdown supported.
          </p>
        </div>
        <Link
          href="/admin/content/docs/new"
          className="inline-flex items-center gap-2 bg-amber-500 text-black font-semibold py-2.5 px-4 rounded-lg text-sm hover:bg-amber-400 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Document
        </Link>
      </div>

      <div className="space-y-2">
        {docs.map(d => (
          <Link
            key={d.id}
            href={`/admin/content/docs/${d.id}`}
            className="group flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition-colors"
          >
            <div>
              <div className="text-white text-sm font-medium">{d.title}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                <span className="uppercase tracking-wider text-amber-500/80">{d.category}</span>
                <span> · /reference/{d.slug}</span>
                <span> · sort {d.sort_order}</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-500 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
