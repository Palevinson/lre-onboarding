import Nav from '@/components/Nav'
import { requireProfile } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  return (
    <div className="min-h-screen bg-gray-950">
      <Nav profile={profile} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
