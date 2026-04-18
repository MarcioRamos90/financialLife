// Package testutil provides helpers for integration tests that require a real database.
// It uses an in-memory SQLite database via the pure-Go glebarez/sqlite GORM driver.
// Schema is derived from GORM AutoMigrate — no separate SQL files to maintain.
package testutil

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/marcioramos/financiallife/internal/model"
)

// Seeds holds the IDs and credentials inserted during DB setup.
type Seeds struct {
	HouseholdID string
	UserID      string // marcio@test.local
	UserID2     string // partner@test.local
	Email       string
	Email2      string
}

// NewDB opens an in-memory SQLite database, runs AutoMigrate against the
// current model definitions, and seeds baseline test data.
// The database is automatically closed when the test ends.
func NewDB(t *testing.T) (*gorm.DB, Seeds) {
	t.Helper()

	// Unique DSN per test so parallel tests don't share state.
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { sqlDB.Close() })

	// AutoMigrate derives the schema from the same model structs used in
	// production — adding a new model here is all that's needed.
	if err := db.AutoMigrate(
		&model.Household{},
		&model.User{},
		&model.RefreshToken{},
		&model.PaymentMethod{},
		&model.Transaction{},
	); err != nil {
		t.Fatalf("AutoMigrate: %v", err)
	}

	return db, seedData(t, db)
}

// seedData inserts a household and two users with password "password" (bcrypt cost 10).
func seedData(t *testing.T, db *gorm.DB) Seeds {
	t.Helper()

	s := Seeds{
		HouseholdID: uuid.New().String(),
		UserID:      uuid.New().String(),
		UserID2:     uuid.New().String(),
		Email:       "marcio@test.local",
		Email2:      "partner@test.local",
	}

	// bcrypt hash of "password" at cost 10
	const passwordHash = "$2b$10$GHk5DADWwtKXONzd.eSskuIose5LWOyDuz3CgncckKTMZdvp1bWf6"

	if err := db.Create(&model.Household{ID: s.HouseholdID, Name: "Test Household"}).Error; err != nil {
		t.Fatalf("seed household: %v", err)
	}

	users := []model.User{
		{ID: s.UserID, HouseholdID: s.HouseholdID, Email: s.Email, DisplayName: "Marcio", PasswordHash: passwordHash, Role: "admin"},
		{ID: s.UserID2, HouseholdID: s.HouseholdID, Email: s.Email2, DisplayName: "Partner", PasswordHash: passwordHash, Role: "member"},
	}
	if err := db.Create(&users).Error; err != nil {
		t.Fatalf("seed users: %v", err)
	}

	return s
}
