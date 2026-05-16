export type UserRole = 'agent' | 'manager' | 'admin'
export type TaskAudience = 'agent' | 'leadership'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  license_number: string | null
  start_date: string | null
  mentor_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TaskTemplate = {
  id: string
  audience: TaskAudience
  sort_order: number
  title: string
  description: string | null
  is_optional: boolean
  cost_note: string | null
  owner_hint: string | null
}

export type TaskCompletion = {
  id: string
  profile_id: string
  template_id: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  note: string | null
  updated_at: string
}

export type TeamContact = {
  id: string
  sort_order: number
  name: string
  role: string
  email: string | null
  office: string | null
  description: string
  is_active: boolean
}

export type ReferenceDoc = {
  id: string
  slug: string
  title: string
  category: string
  sort_order: number
  content: string
  updated_at: string
}

export type AgentIntake = {
  id: string
  profile_id: string
  birthday: string | null
  three_words: string | null
  favorite_sonic_drink: string | null
  family_description: string | null
  life_highlight: string | null
  favorite_restaurant: string | null
  little_known_fact: string | null
  dream_destination: string | null
  years_as_realtor: number | null
  favorite_part_re: string | null
  phone_number: string | null
  mailing_address: string | null
  city: string | null
  state: string | null
  county: string | null
  zip: string | null
  gender: string | null
  marital_status: string | null
  business_name: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  tshirt_size: string | null
  recruited_by: string | null
  w9_submitted: boolean
  submitted_at: string | null
  updated_at: string
}
