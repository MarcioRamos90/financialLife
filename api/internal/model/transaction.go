package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ─── Domain models ────────────────────────────────────────────────────────────

type PaymentMethod struct {
	ID          string         `gorm:"type:text;primaryKey"                                                  json:"id"`
	HouseholdID string         `gorm:"type:text;not null;index"                                              json:"household_id"`
	Name        string         `gorm:"type:text;not null"                                                    json:"name"`
	Type        string         `gorm:"type:text;not null;check:type IN ('credit_card','debit_card','bank_transfer','pix','cash','other')" json:"type"`
	CreatedAt   time.Time      `                                                                             json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index"                                                                json:"-"`
}

type Transaction struct {
	ID              string         `gorm:"type:text;primaryKey"                                            json:"id"`
	HouseholdID     string         `gorm:"type:text;not null;index"                                        json:"household_id"`
	RecordedBy      string         `gorm:"type:text;not null;index"                                        json:"recorded_by"`
	RecordedByUser  User           `gorm:"foreignKey:RecordedBy"                                           json:"-"`
	AccountID       string         `gorm:"type:text;not null;index"                                        json:"account_id"`
	Account         Account        `gorm:"foreignKey:AccountID"                                            json:"-"`
	ToAccountID     *string        `gorm:"type:text;index"                                                 json:"to_account_id"`
	ToAccount       *Account       `gorm:"foreignKey:ToAccountID"                                          json:"-"`
	Type            string         `gorm:"type:text;not null;check:type IN ('income','expense','transfer')" json:"type"`
	Amount          float64        `gorm:"not null;check:amount > 0"                                       json:"amount"`
	Currency        string         `gorm:"type:text;not null;default:BRL"                                  json:"currency"`
	Description     string         `gorm:"type:text"                                                       json:"description"`
	Category        string         `gorm:"type:text"                                                       json:"category"`
	IsJoint         bool           `gorm:"default:false"                                                   json:"is_joint"`
	PaymentMethodID *string        `gorm:"type:text;index"                                                 json:"payment_method_id"`
	PaymentMethod   *PaymentMethod `gorm:"foreignKey:PaymentMethodID"                                      json:"-"`
	TransactionDate string         `gorm:"type:text;not null;index"                                        json:"transaction_date"`
	CreatedAt       time.Time      `                                                                       json:"created_at"`
	UpdatedAt       time.Time      `                                                                       json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index"                                                           json:"-"`

	// Virtual fields — populated from associations, not stored in the DB.
	RecordedByName    string  `gorm:"-" json:"recorded_by_name"`
	PaymentMethodName *string `gorm:"-" json:"payment_method_name"`
}

// BeforeCreate generates a UUID if the ID is not already set.
func (t *Transaction) BeforeCreate(_ *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

func (p *PaymentMethod) BeforeCreate(_ *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

type CreateTransactionRequest struct {
	AccountID       string  `json:"account_id"`
	ToAccountID     *string `json:"to_account_id"`     // required when type = "transfer"
	Type            string  `json:"type"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	Description     string  `json:"description"`
	Category        string  `json:"category"`
	IsJoint         bool    `json:"is_joint"`
	PaymentMethodID *string `json:"payment_method_id"`
	TransactionDate string  `json:"transaction_date"`  // "YYYY-MM-DD"
}

type UpdateTransactionRequest struct {
	AccountID       string  `json:"account_id"`
	ToAccountID     *string `json:"to_account_id"`     // required when type = "transfer"
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
	AccountID  string // filter by account
}

// ─── Validation helpers ───────────────────────────────────────────────────────

var validTypes = map[string]bool{"income": true, "expense": true, "transfer": true}

func (r *CreateTransactionRequest) Validate() string {
	if r.AccountID == "" {
		return "account_id is required"
	}
	if !validTypes[r.Type] {
		return "type must be income, expense, or transfer"
	}
	if r.Amount <= 0 {
		return "amount must be greater than zero"
	}
	if r.TransactionDate == "" {
		return "transaction_date is required (YYYY-MM-DD)"
	}
	if r.Type == "transfer" && (r.ToAccountID == nil || *r.ToAccountID == "") {
		return "to_account_id is required for transfer transactions"
	}
	if r.Type == "transfer" && r.ToAccountID != nil && *r.ToAccountID == r.AccountID {
		return "to_account_id must differ from account_id"
	}
	return ""
}

func (r *UpdateTransactionRequest) Validate() string {
	if r.AccountID == "" {
		return "account_id is required"
	}
	if !validTypes[r.Type] {
		return "type must be income, expense, or transfer"
	}
	if r.Amount <= 0 {
		return "amount must be greater than zero"
	}
	if r.TransactionDate == "" {
		return "transaction_date is required (YYYY-MM-DD)"
	}
	if r.Type == "transfer" && (r.ToAccountID == nil || *r.ToAccountID == "") {
		return "to_account_id is required for transfer transactions"
	}
	if r.Type == "transfer" && r.ToAccountID != nil && *r.ToAccountID == r.AccountID {
		return "to_account_id must differ from account_id"
	}
	return ""
}
