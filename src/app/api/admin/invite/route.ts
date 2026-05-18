import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Body = {
  email: string
  full_name: string
  start_date?: string | null
  role?: 'agent' | 'manager' | 'admin'
}

export async function POST(req: Request) {
  // 1. Auth: caller must be manager or admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!caller || !['manager', 'admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Validate body
  let body: Body
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const email = body.email?.trim().toLowerCase()
  const full_name = body.full_name?.trim()
  const role = body.role ?? 'agent'
  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 })
  }
  if (role !== 'agent' && caller.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can create manager/admin accounts' }, { status: 403 })
  }

  // 3. Send the invite email (Supabase creates the auth user AND sends the email)
  const origin = new URL(req.url).origin
  const redirectTo = `${origin}/auth/callback?next=/reset-password`

  const admin = createAdminClient()
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name },
  })
  if (inviteErr || !invited?.user) {
    return NextResponse.json({ error: inviteErr?.message ?? 'Failed to send invite' }, { status: 400 })
  }

  // 4. Update profile (handle_new_user trigger created a base row; overwrite the
  // fields we know about). Use the admin client to bypass RLS.
  const { error: profErr } = await admin.from('profiles').update({
    full_name,
    start_date: body.start_date || null,
    role,
  }).eq('id', invited.user.id)
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 400 })
  }

  return NextResponse.json({ email, full_name, role, sent_at: new Date().toISOString() })
}
