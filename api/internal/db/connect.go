package db

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"
	_ "github.com/jackc/pgx/v5/stdlib" // pgx driver registered as "pgx"
	"github.com/rs/zerolog/log"

	"github.com/marcioramos/financiallife/internal/config"
)

// Connect opens a connection pool to PostgreSQL and verifies connectivity.
func Connect(cfg *config.Config) (*sqlx.DB, error) {
	db, err := sqlx.Open("pgx", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("sqlx.Open: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("db.Ping: %w", err)
	}

	return db, nil
}

// RunMigrations applies all pending up-migrations from db/migrations/.
func RunMigrations(cfg *config.Config) error {
	m, err := migrate.New("file://db/migrations", cfg.DSN())
	if err != nil {
		return fmt.Errorf("migrate.New: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate.Up: %w", err)
	}

	version, _, _ := m.Version()
	log.Info().Uint("version", version).Msg("migrations up to date")
	return nil
}
