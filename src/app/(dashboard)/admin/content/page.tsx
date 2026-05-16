import Link from 'next/link'
import { ArrowRight, ClipboardList, Users, BookOpen, ChevronLeft, ClipboardEdit } from 'lucide-react'
import { requireRole } from '@/lib/auth'

export default async function ContentHubPage() {
  await requireRole(['admin'])
  const sections = [
    {
      href: '/admin/content/tasks',
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'Welcome Week + Leadership Tasks',
      desc: 'Add, edit, reorder, or remove checklist items for new agents and leadership.',
    },
    {
      href: '/admin/content/intake',
      icon: <ClipboardEdit className="w-5 h-5" />,
      title: 'Intake Form Questions',
      desc: 'Add, edit, reorder, hide, or remove questions on the agent intake form.',
    },
    {
      href: '/admin/content/team',
      icon: <Users className="w-5 h-5" />,
      title: 'Team Directory',
      desc: 'Add or update leadership contacts agents see in the Team tab.',
    },
    {
      href: '/admin/content/docs',
      icon: <BookOpen className="w-5 h-5" />,
      title: 'Reference Library',
      desc: 'Edit the content of Compensation, Mentorship, Contract Checklists, and other reference docs.',
    },
  ]
  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Roster
      </Link>
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Admin Only</p>
        <h1 className="text-3xl font-serif text-white">Manage Content</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-2xl">
          Edit what new agents see — checklist items, team contacts, and reference documents — without touching code.
          Changes go live immediately.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="group bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-5 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-amber-500">{s.icon}</div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-500 transition-colors" />
            </div>
            <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
