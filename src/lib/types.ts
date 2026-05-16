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

export type IntakeFieldType = 'text' | 'textarea' | 'date' | 'number' | 'email' | 'phone' | 'select' | 'checkbox'

export type IntakeQuestion = {
  id: string
  section: string
  sort_order: number
  label: string
  help_text: string | null
  field_type: IntakeFieldType
  is_required: boolean
  options: string[] | null
  placeholder: string | null
  is_active: boolean
}

export type IntakeResponseValue = string | number | boolean | null
export type IntakeResponses = Record<string, IntakeResponseValue>

export type AgentIntake = {
  id: string
  profile_id: string
  responses: IntakeResponses
  submitted_at: string | null
  updated_at: string
}
