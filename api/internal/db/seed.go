package db

import (
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/marcioramos/financiallife/internal/model"
)

// Seed inserts the development household and users if they don't exist yet.
// Safe to call on every startup — it's a no-op when data is already present.
// Never runs in production (caller must check AppEnv).
func Seed(db *gorm.DB) error {
	var count int64
	db.Model(&model.User{}).Count(&count)
	if count > 0 {
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password"), 10)
	if err != nil {
		return err
	}

	household := model.Household{
		Name:     "Our Household",
		Currency: "BRL",
		Timezone: "America/Sao_Paulo",
	}
	if err := db.Create(&household).Error; err != nil {
		return err
	}

	users := []model.User{
		{HouseholdID: household.ID, Email: "marcio@home.local", DisplayName: "Marcio", PasswordHash: string(hash), Role: "admin"},
		{HouseholdID: household.ID, Email: "wife@home.local", DisplayName: "Wife", PasswordHash: string(hash), Role: "admin"},
	}
	if err := db.Create(&users).Error; err != nil {
		return err
	}

	// Seed a default "Cash" account so transactions can reference it.
	defaultAccount := model.Account{
		HouseholdID:    household.ID,
		Name:           "Cash",
		Type:           "cash",
		IsJoint:        true,
		Currency:       household.Currency,
		InitialBalance: 0,
	}
	return db.Create(&defaultAccount).Error
}
