export interface IncomeSource {
  id: string
  household_id: string
  user_id: string
  owner_name: string
  name: string
  category: string
  default_amount: number
  currency: string
  recurrence_day: number  // 0 = unset, 1-31 = day of month
  is_joint: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IncomeEntry {
  id: string
  income_source_id: string
  user_id: string
  year: number
  month: number
  expected_amount: number
  received_amount: number
  received_on: string | null  // YYYY-MM-DD
  notes: string
  created_at: string
  updated_at: string
}

export interface IncomeSourceFormData {
  name: string
  category: string
  default_amount: string  // string for form binding
  currency: string
  recurrence_day: string  // string for form binding
  is_joint: boolean
}

export interface IncomeEntryFormData {
  year: number
  month: number
  expected_amount: string
  received_amount: string
  received_on: string
  notes: string
}

export const INCOME_SOURCE_CATEGORIES = [
  'Salary',
  'Freelance',
  'Rental',
  'Investment',
  'Pension',
  'Business',
  'Gift',
  'Other',
]

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
