import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import InviteForm from './InviteForm'

export default async function InviteAgentPage() {
  const caller = await requireRole(['manager', 'admin'])
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/admin" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Roster
      </Link>
      <div>
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Leadership</p>
        <h1 className="text-3xl font-serif text-white">Invite New Agent</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-xl leading-relaxed">
          Create the account here, then share the credentials with the agent via WhatsApp,
          email, or in person. They can change their password after their first login.
        </p>
      </div>
      <InviteForm canCreateStaff={caller.role === 'admin'} />
    </div>
  )
}
