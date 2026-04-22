package db

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/marcioramos/financiallife/internal/config"
	"github.com/marcioramos/financiallife/internal/model"
)

// Connect opens a GORM connection to PostgreSQL, runs AutoMigrate, and returns
// the *gorm.DB. AutoMigrate creates or updates all tables to match the current
// model definitions — no separate SQL migration files needed.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Warn
	if cfg.AppEnv != "production" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("gorm.Open: %w", err)
	}

	// Configure the underlying connection pool.
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("db.DB(): %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("AutoMigrate: %w", err)
	}

	return db, nil
}

// migrate runs GORM AutoMigrate for all application models.
// Add new models here when you introduce new tables.
func migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.Household{},
		&model.User{},
		&model.RefreshToken{},
		&model.Account{},
		&model.PaymentMethod{},
		&model.Transaction{},
		&model.IncomeSource{},
		&model.IncomeEntry{},
	)
}
