export interface PaymentMethod {
  id: string
  household_id: string
  name: string
  type: string
}

export interface Transaction {
  id: string
  household_id: string
  recorded_by: string
  recorded_by_name: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency: string
  description: string
  category: string
  is_joint: boolean
  payment_method_id: string | null
  payment_method_name: string | null
  income_source_id: string | null
  transaction_date: string  // "YYYY-MM-DD"
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface TransactionFormData {
  type: 'income' | 'expense' | 'transfer'
  amount: string
  currency: string
  description: string
  category: string
  is_joint: boolean
  payment_method_id: string
  income_source_id: string   // empty string = no link; source ID = linked
  transaction_date: string
}

export interface TransactionFilters {
  start_date?: string
  end_date?: string
  type?: string
  category?: string
}

export const EXPENSE_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Health', 'Entertainment',
  'Education', 'Shopping', 'Utilities', 'Insurance', 'Personal', 'Other',
]

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Rental', 'Investment', 'Gift', 'Other',
]
