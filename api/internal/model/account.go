package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ─── Domain model ─────────────────────────────────────────────────────────────

type Account struct {
	ID             string     `gorm:"type:text;primaryKey"                                                                    json:"id"`
	HouseholdID    string     `gorm:"type:text;not null;index"                                                                json:"household_id"`
	Name           string     `gorm:"type:text;not null"                                                                      json:"name"`
	Type           string     `gorm:"type:text;not null;check:type IN ('checking','savings','cash','investment','other')"      json:"type"`
	IsJoint        bool       `gorm:"default:false"                                                                           json:"is_joint"`
	Currency       string     `gorm:"type:text;not null;default:BRL"                                                          json:"currency"`
	Color          string     `gorm:"type:text"                                                                               json:"color"`
	Icon           string     `gorm:"type:text"                                                                               json:"icon"`
	InitialBalance float64    `gorm:"not null;default:0"                                                                      json:"initial_balance"`
	ArchivedAt     *time.Time `gorm:"index"                                                                                   json:"archived_at"`
	CreatedAt      time.Time  `                                                                                               json:"created_at"`
	UpdatedAt      time.Time  `                                                                                               json:"updated_at"`
}

// BeforeCreate generates a UUID if the ID is not already set.
func (a *Account) BeforeCreate(_ *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

type CreateAccountRequest struct {
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	IsJoint        bool    `json:"is_joint"`
	Currency       string  `json:"currency"`
	Color          string  `json:"color"`
	Icon           string  `json:"icon"`
	InitialBalance float64 `json:"initial_balance"`
}

type UpdateAccountRequest struct {
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	IsJoint        bool    `json:"is_joint"`
	Currency       string  `json:"currency"`
	Color          string  `json:"color"`
	Icon           string  `json:"icon"`
	InitialBalance float64 `json:"initial_balance"`
}

type AccountBalanceResponse struct {
	AccountID string  `json:"account_id"`
	Balance   float64 `json:"balance"`
}

// ─── Validation helpers ───────────────────────────────────────────────────────

var validAccountTypes = map[string]bool{
	"checking":   true,
	"savings":    true,
	"cash":       true,
	"investment": true,
	"other":      true,
}

func (r *CreateAccountRequest) Validate() string {
	if r.Name == "" {
		return "name is required"
	}
	if !validAccountTypes[r.Type] {
		return "type must be checking, savings, cash, investment, or other"
	}
	return ""
}

func (r *UpdateAccountRequest) Validate() string {
	if r.Name == "" {
		return "name is required"
	}
	if !validAccountTypes[r.Type] {
		return "type must be checking, savings, cash, investment, or other"
	}
	return ""
}
