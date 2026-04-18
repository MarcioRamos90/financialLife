package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ─── Domain models ────────────────────────────────────────────────────────────

type IncomeSource struct {
	ID            string    `gorm:"type:text;primaryKey"                    json:"id"`
	HouseholdID   string    `gorm:"type:text;not null;index"                json:"household_id"`
	UserID        string    `gorm:"type:text;not null;index"                json:"user_id"`
	User          User      `gorm:"foreignKey:UserID"                       json:"-"`
	Name          string    `gorm:"type:text;not null"                      json:"name"`
	Category      string    `gorm:"type:text"                               json:"category"`
	DefaultAmount float64   `gorm:"not null;default:0"                      json:"default_amount"`
	Currency      string    `gorm:"type:text;not null;default:'BRL'"        json:"currency"`
	RecurrenceDay int       `gorm:"default:0"                              json:"recurrence_day"` // day of month (0 = unset)
	IsJoint       bool      `gorm:"default:false"                           json:"is_joint"`
	IsActive      bool      `gorm:"default:true"                            json:"is_active"`
	CreatedAt     time.Time `                                               json:"created_at"`
	UpdatedAt     time.Time `                                               json:"updated_at"`

	// Virtual — populated from associations, not stored in the DB.
	OwnerName string `gorm:"-" json:"owner_name"`
}

func (s *IncomeSource) BeforeCreate(_ *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

type IncomeEntry struct {
	ID             string  `gorm:"type:text;primaryKey"                                json:"id"`
	IncomeSourceID string  `gorm:"type:text;not null;uniqueIndex:idx_entry_period"     json:"income_source_id"`
	UserID         string  `gorm:"type:text;not null"                                  json:"user_id"`
	Year           int     `gorm:"not null;uniqueIndex:idx_entry_period"               json:"year"`
	Month          int     `gorm:"not null;uniqueIndex:idx_entry_period"               json:"month"` // 1-12
	ExpectedAmount float64 `gorm:"not null;default:0"                                  json:"expected_amount"`
	ReceivedAmount float64 `gorm:"not null;default:0"                                  json:"received_amount"`
	ReceivedOn     *string `gorm:"type:text"                                           json:"received_on"` // YYYY-MM-DD
	Notes          string  `gorm:"type:text"                                           json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (e *IncomeEntry) BeforeCreate(_ *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

type CreateIncomeSourceRequest struct {
	Name          string  `json:"name"`
	Category      string  `json:"category"`
	DefaultAmount float64 `json:"default_amount"`
	Currency      string  `json:"currency"`
	RecurrenceDay int     `json:"recurrence_day"`
	IsJoint       bool    `json:"is_joint"`
}

type UpdateIncomeSourceRequest struct {
	Name          string  `json:"name"`
	Category      string  `json:"category"`
	DefaultAmount float64 `json:"default_amount"`
	Currency      string  `json:"currency"`
	RecurrenceDay int     `json:"recurrence_day"`
	IsJoint       bool    `json:"is_joint"`
}

type CreateIncomeEntryRequest struct {
	Year           int     `json:"year"`
	Month          int     `json:"month"`
	ExpectedAmount float64 `json:"expected_amount"`
	ReceivedAmount float64 `json:"received_amount"`
	ReceivedOn     *string `json:"received_on"` // YYYY-MM-DD, optional
	Notes          string  `json:"notes"`
}

// ─── Validation helpers ───────────────────────────────────────────────────────

func (r *CreateIncomeSourceRequest) Validate() string {
	if r.Name == "" {
		return "name is required"
	}
	if r.DefaultAmount < 0 {
		return "default_amount must be zero or greater"
	}
	if r.RecurrenceDay < 0 || r.RecurrenceDay > 31 {
		return "recurrence_day must be between 0 and 31"
	}
	return ""
}

func (r *UpdateIncomeSourceRequest) Validate() string {
	if r.Name == "" {
		return "name is required"
	}
	if r.DefaultAmount < 0 {
		return "default_amount must be zero or greater"
	}
	if r.RecurrenceDay < 0 || r.RecurrenceDay > 31 {
		return "recurrence_day must be between 0 and 31"
	}
	return ""
}

func (r *CreateIncomeEntryRequest) Validate() string {
	if r.Year < 2000 || r.Year > 2100 {
		return "year is invalid"
	}
	if r.Month < 1 || r.Month > 12 {
		return "month must be between 1 and 12"
	}
	if r.ReceivedAmount < 0 {
		return "received_amount must be zero or greater"
	}
	return ""
}
