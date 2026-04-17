package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	APIPort string
	AppEnv  string

	// Database
	DBUser     string
	DBPassword string
	DBName     string
	DBHost     string
	DBPort     string

	// JWT (HS256 — single shared secret)
	JWTSecret             string
	JWTAccessTokenExpiry  string
	JWTRefreshTokenExpiry string

	// CORS
	CORSAllowedOrigin string
}

// DSN returns the PostgreSQL connection string.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName,
	)
}

// Load reads configuration from the environment (and optionally a .env file).
func Load() (*Config, error) {
	// Load .env if it exists — safe to ignore the error in production
	_ = godotenv.Load()

	cfg := &Config{
		APIPort:               getEnv("API_PORT", "8080"),
		AppEnv:                getEnv("APP_ENV", "development"),
		DBUser:                requireEnv("DB_USER"),
		DBPassword:            requireEnv("DB_PASSWORD"),
		DBName:                requireEnv("DB_NAME"),
		DBHost:                getEnv("DB_HOST", "localhost"),
		DBPort:                getEnv("DB_PORT", "5432"),
		JWTSecret:             requireEnv("JWT_SECRET"),
		JWTAccessTokenExpiry:  getEnv("JWT_ACCESS_TOKEN_EXPIRY", "15m"),
		JWTRefreshTokenExpiry: getEnv("JWT_REFRESH_TOKEN_EXPIRY", "720h"),
		CORSAllowedOrigin:     getEnv("CORS_ALLOWED_ORIGIN", "http://localhost:5173"),
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %q is not set", key))
	}
	return v
}
