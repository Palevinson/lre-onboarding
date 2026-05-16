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
  // Only admins can invite other managers/admins
  if (role !== 'agent' && caller.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can create manager/admin accounts' }, { status: 403 })
  }

  // 3. Create user with temp password
  const temp_password = generateTempPassword()
  const admin = createAdminClient()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (createErr || !created?.user) {
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create user' }, { status: 400 })
  }

  // 4. Update profile with full_name + start_date + role
  // The handle_new_user trigger inserts a base profile row; we overwrite to make sure
  // full_name (sometimes missed if metadata isn't read) and role are correct.
  const { error: profErr } = await admin.from('profiles').update({
    full_name,
    start_date: body.start_date || null,
    role,
  }).eq('id', created.user.id)
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 400 })
  }

  return NextResponse.json({ email, temp_password, full_name, role })
}

function generateTempPassword(): string {
  // 12 chars, no visually ambiguous characters (0/O, 1/I/l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]).join('')
}
