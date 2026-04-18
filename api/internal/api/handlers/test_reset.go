package handlers

import (
	"net/http"

	"gorm.io/gorm"
	"golang.org/x/crypto/bcrypt"

	"github.com/marcioramos/financiallife/internal/model"
)

// NewTestResetHandler returns an http.HandlerFunc that wipes all data and
// re-seeds the two dev users. Must only be registered when APP_ENV=test.
func NewTestResetHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Wipe in reverse FK order
		tables := []any{
			&model.Transaction{},
			&model.PaymentMethod{},
			&model.RefreshToken{},
			&model.User{},
			&model.Household{},
		}
		for _, t := range tables {
			if err := db.Unscoped().Where("1 = 1").Delete(t).Error; err != nil {
				jsonError(w, "reset failed: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}

		// Re-seed
		hash, _ := bcrypt.GenerateFromPassword([]byte("password"), 10)
		household := model.Household{Name: "Our Household", Currency: "BRL", Timezone: "America/Sao_Paulo"}
		if err := db.Create(&household).Error; err != nil {
			jsonError(w, "seed failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		users := []model.User{
			{HouseholdID: household.ID, Email: "marcio@home.local", DisplayName: "Marcio", PasswordHash: string(hash), Role: "admin"},
			{HouseholdID: household.ID, Email: "wife@home.local", DisplayName: "Wife", PasswordHash: string(hash), Role: "admin"},
		}
		if err := db.Create(&users).Error; err != nil {
			jsonError(w, "seed failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
