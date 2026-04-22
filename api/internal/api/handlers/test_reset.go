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
		// Truncate all tables in one shot; CASCADE handles FK order automatically.
		sql := "TRUNCATE TABLE transactions, payment_methods, refresh_tokens, users, accounts, households RESTART IDENTITY CASCADE"
		if err := db.Exec(sql).Error; err != nil {
			jsonError(w, "reset failed: "+err.Error(), http.StatusInternalServerError)
			return
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
		defaultAccount := model.Account{
			HouseholdID: household.ID,
			Name:        "Cash",
			Type:        "cash",
			IsJoint:     true,
			Currency:    household.Currency,
		}
		if err := db.Create(&defaultAccount).Error; err != nil {
			jsonError(w, "seed failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
