import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DocEditor from './DocEditor'
import type { ReferenceDoc } from '@/lib/types'

export default async function DocEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin'])
  const { id } = await params
  const isNew = id === 'new'

  let doc: ReferenceDoc | null = null
  if (!isNew) {
    const supabase = await createClient()
    const { data } = await supabase.from('reference_docs').select('*').eq('id', id).maybeSingle()
    if (!data) notFound()
    doc = data as ReferenceDoc
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin/content/docs" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Reference Library
      </Link>
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Admin Only</p>
        <h1 className="text-3xl font-serif text-white">{isNew ? 'New Document' : 'Edit Document'}</h1>
      </div>
      <DocEditor initial={doc} />
    </div>
  )
}
