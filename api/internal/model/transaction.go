package model

import "time"

// ─── Domain models ────────────────────────────────────────────────────────────

type PaymentMethod struct {
	ID          string     `db:"id"           json:"id"`
	HouseholdID string     `db:"household_id" json:"household_id"`
	Name        string     `db:"name"         json:"name"`
	Type        string     `db:"type"         json:"type"`
	CreatedAt   DBTime     `db:"created_at"   json:"created_at"`
	DeletedAt   *time.Time `db:"deleted_at"   json:"-"`
}

type Transaction struct {
	ID                string     `db:"id"                 json:"id"`
	HouseholdID       string     `db:"household_id"       json:"household_id"`
	RecordedBy        string     `db:"recorded_by"        json:"recorded_by"`
	RecordedByName    string     `db:"recorded_by_name"   json:"recorded_by_name"` // joined from users
	Type              string     `db:"type"               json:"type"`
	Amount            float64    `db:"amount"             json:"amount"`
	Currency          string     `db:"currency"           json:"currency"`
	Description       string     `db:"description"        json:"description"`
	Category          string     `db:"category"           json:"category"`
	IsJoint           bool       `db:"is_joint"           json:"is_joint"`
	PaymentMethodID   *string    `db:"payment_method_id"  json:"payment_method_id"`
	PaymentMethodName *string    `db:"payment_method_name" json:"payment_method_name"` // joined
	IncomeSourceID    *string    `db:"income_source_id"   json:"income_source_id"`
	TransactionDate   string     `db:"transaction_date"   json:"transaction_date"` // "YYYY-MM-DD"
	CreatedAt         DBTime     `db:"created_at"         json:"created_at"`
	UpdatedAt         DBTime     `db:"updated_at"         json:"updated_at"`
	DeletedAt         *time.Time `db:"deleted_at"         json:"-"`
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

type CreateTransactionRequest struct {
	Type            string  `json:"type"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	Description     string  `json:"description"`
	Category        string  `json:"category"`
	IsJoint         bool    `json:"is_joint"`
	PaymentMethodID *string `json:"payment_method_id"`
	TransactionDate string  `json:"transaction_date"` // "YYYY-MM-DD"
}

type UpdateTransactionRequest struct {
	Type            string  `json:"type"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	Description     string  `json:"description"`
	Category        string  `json:"category"`
	IsJoint         bool    `json:"is_joint"`
	PaymentMethodID *string `json:"payment_method_id"`
	TransactionDate string  `json:"transaction_date"`
}

type TransactionFilters struct {
	StartDate  string // YYYY-MM-DD
	EndDate    string // YYYY-MM-DD
	Type       string // income | expense | transfer
	Category   string
	RecordedBy string // user ID
}

// ─── Validation helpers ───────────────────────────────────────────────────────

var validTypes = map[string]bool{"income": true, "expense": true, "transfer": true}

func (r *CreateTransactionRequest) Validate() string {
	if !validTypes[r.Type] {
		return "type must be income, expense, or transfer"
	}
	if r.Amount <= 0 {
		return "amount must be greater than zero"
	}
	if r.TransactionDate == "" {
		return "transaction_date is required (YYYY-MM-DD)"
	}
	return ""
}

func (r *UpdateTransactionRequest) Validate() string {
	if !validTypes[r.Type] {
		return "type must be income, expense, or transfer"
	}
	if r.Amount <= 0 {
		return "amount must be greater than zero"
	}
	if r.TransactionDate == "" {
		return "transaction_date is required (YYYY-MM-DD)"
	}
	return ""
}
