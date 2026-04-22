export type AccountType = 'checking' | 'savings' | 'cash' | 'investment' | 'other'

export interface Account {
  id: string
  household_id: string
  name: string
  type: AccountType
  is_joint: boolean
  currency: string
  color: string
  icon: string
  initial_balance: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AccountBalance {
  account_id: string
  balance: number
}

export interface AccountFormData {
  name: string
  type: AccountType
  is_joint: boolean
  currency: string
  color: string
  icon: string
  initial_balance: string // string in form, parsed to float on submit
}

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking',   label: 'Checking'   },
  { value: 'savings',    label: 'Savings'    },
  { value: 'cash',       label: 'Cash'       },
  { value: 'investment', label: 'Investment' },
  { value: 'other',      label: 'Other'      },
]

export const ACCOUNT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6B7280', // gray
]
