package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Household struct {
	ID        string    `gorm:"type:text;primaryKey"                         json:"id"`
	Name      string    `gorm:"type:text;not null"                           json:"name"`
	Currency  string    `gorm:"type:text;not null;default:BRL"               json:"currency"`
	Timezone  string    `gorm:"type:text;not null;default:America/Sao_Paulo" json:"timezone"`
	PayDay    *int      `gorm:"type:smallint"                                json:"pay_day"`
	CreatedAt time.Time `                                                    json:"created_at"`
	UpdatedAt time.Time `                                                    json:"updated_at"`
}

type User struct {
	ID           string         `gorm:"type:text;primaryKey"                                              json:"id"`
	HouseholdID  string         `gorm:"type:text;not null;index"                                          json:"household_id"`
	Email        string         `gorm:"type:text;uniqueIndex;not null"                                    json:"email"`
	DisplayName  string         `gorm:"type:text;not null"                                                json:"display_name"`
	PasswordHash string         `gorm:"type:text;not null"                                                json:"-"`
	Role         string         `gorm:"type:text;not null;default:member;check:role IN ('admin','member')" json:"role"`
	CreatedAt    time.Time      `                                                                          json:"created_at"`
	UpdatedAt    time.Time      `                                                                          json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index"                                                             json:"-"`
}

// RefreshToken maps to the refresh_tokens table.
type RefreshToken struct {
	ID        string     `gorm:"type:text;primaryKey"`
	UserID    string     `gorm:"type:text;not null;index"`
	TokenHash string     `gorm:"type:text;uniqueIndex;not null"`
	ExpiresAt time.Time  `gorm:"not null"`
	RevokedAt *time.Time
	CreatedAt time.Time
}

// UserProfile is the safe public representation (no password hash).
type UserProfile struct {
	ID          string `json:"id"`
	HouseholdID string `json:"household_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
}

// BeforeCreate generates a UUID if the ID is not already set.
func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

func (h *Household) BeforeCreate(_ *gorm.DB) error {
	if h.ID == "" {
		h.ID = uuid.New().String()
	}
	return nil
}

func (r *RefreshToken) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

func (u *User) ToProfile() UserProfile {
	return UserProfile{
		ID:          u.ID,
		HouseholdID: u.HouseholdID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Role:        u.Role,
	}
}
