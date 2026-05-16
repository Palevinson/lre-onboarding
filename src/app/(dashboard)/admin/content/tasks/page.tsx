import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TasksEditor from './TasksEditor'
import type { TaskTemplate } from '@/lib/types'

export default async function TasksContentPage() {
  await requireRole(['admin'])
  const supabase = await createClient()
  const { data } = await supabase.from('task_templates').select('*').order('audience').order('sort_order')
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin/content" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Manage Content
      </Link>
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Admin Only</p>
        <h1 className="text-3xl font-serif text-white">Tasks Editor</h1>
        <p className="text-gray-400 text-sm mt-2">
          Welcome Week (Agent) and Leadership To-Dos. Sort order is rendered low → high.
        </p>
      </div>
      <TasksEditor initial={(data ?? []) as TaskTemplate[]} />
    </div>
  )
}
