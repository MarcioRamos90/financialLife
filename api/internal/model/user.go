package model

import "time"

type Household struct {
	ID        string    `db:"id"         json:"id"`
	Name      string    `db:"name"       json:"name"`
	Currency  string    `db:"currency"   json:"currency"`
	Timezone  string    `db:"timezone"   json:"timezone"`
	PayDay    *int      `db:"pay_day"    json:"pay_day"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type User struct {
	ID           string     `db:"id"            json:"id"`
	HouseholdID  string     `db:"household_id"  json:"household_id"`
	Email        string     `db:"email"         json:"email"`
	DisplayName  string     `db:"display_name"  json:"display_name"`
	PasswordHash string     `db:"password_hash" json:"-"`
	Role         string     `db:"role"          json:"role"`
	CreatedAt    time.Time  `db:"created_at"    json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"    json:"updated_at"`
	DeletedAt    *time.Time `db:"deleted_at"    json:"-"`
}

// UserProfile is the safe public representation (no password hash).
type UserProfile struct {
	ID          string `json:"id"`
	HouseholdID string `json:"household_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
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
