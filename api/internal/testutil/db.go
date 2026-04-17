// Package testutil provides helpers for integration tests that require a real database.
// It uses an in-memory SQLite database (modernc.org/sqlite — pure Go, no CGo).
package testutil

import (
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite" // register "sqlite" driver
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Seeds holds the IDs and credentials inserted during DB setup.
type Seeds struct {
	HouseholdID string
	UserID      string // marcio@test.local
	UserID2     string // partner@test.local
	Email       string
	Email2      string
	// Password for both users is "password"
}

// NewDB opens an in-memory SQLite database, runs the SQLite migrations in order,
// and seeds baseline test data. The database is closed automatically when the test ends.
//
// Adding a new production migration? Add the matching SQLite migration file to
// internal/testutil/migrations/ — NewDB will pick it up automatically.
func NewDB(t *testing.T) (*sqlx.DB, Seeds) {
	t.Helper()

	// Each test gets its own in-memory DB via a unique URI to avoid cross-test interference.
	db, err := sqlx.Open("sqlite", fmt.Sprintf("file:%s?mode=memory&cache=shared&_foreign_keys=on", t.Name()))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	// Use a single connection so the in-memory DB persists for the test lifetime.
	db.SetMaxOpenConns(1)

	t.Cleanup(func() { db.Close() })

	runMigrations(t, db)
	return db, seedData(t, db)
}

// runMigrations reads all *.sql files from the embedded migrations directory
// and executes them in lexicographic order (001, 002, 003, …).
func runMigrations(t *testing.T, db *sqlx.DB) {
	t.Helper()

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		t.Fatalf("read migrations dir: %v", err)
	}

	// Sort by filename so migrations run in order (001, 002, 003, …).
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		data, err := migrationsFS.ReadFile("migrations/" + entry.Name())
		if err != nil {
			t.Fatalf("read migration %s: %v", entry.Name(), err)
		}
		if _, err := db.Exec(string(data)); err != nil {
			t.Fatalf("run migration %s: %v", entry.Name(), err)
		}
	}
}

// seedData inserts a household and two users with password "password" (bcrypt cost 10).
func seedData(t *testing.T, db *sqlx.DB) Seeds {
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

	if _, err := db.Exec(
		`INSERT INTO households (id, name) VALUES (?, ?)`,
		s.HouseholdID, "Test Household",
	); err != nil {
		t.Fatalf("seed household: %v", err)
	}

	if _, err := db.Exec(
		`INSERT INTO users (id, household_id, email, display_name, password_hash, role) VALUES
			(?, ?, ?, ?, ?, 'admin'),
			(?, ?, ?, ?, ?, 'member')`,
		s.UserID, s.HouseholdID, s.Email, "Marcio", passwordHash,
		s.UserID2, s.HouseholdID, s.Email2, "Partner", passwordHash,
	); err != nil {
		t.Fatalf("seed users: %v", err)
	}

	return s
}
