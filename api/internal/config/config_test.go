package config

import (
	"os"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	// Setup required environment variables for the test
	os.Setenv("DB_USER", "testuser")
	os.Setenv("DB_PASSWORD", "testpass")
	os.Setenv("DB_NAME", "testdb")
	os.Setenv("JWT_SECRET", "supersecret")

	// Ensure we clean up environment variables after the test completes
	t.Cleanup(func() {
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("JWT_SECRET")
	})

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error loading config, got: %v", err)
	}

	// Test required variables are set correctly
	if cfg.DBUser != "testuser" {
		t.Errorf("expected DBUser 'testuser', got %q", cfg.DBUser)
	}
	if cfg.JWTSecret != "supersecret" {
		t.Errorf("expected JWTSecret 'supersecret', got %q", cfg.JWTSecret)
	}

	// Test defaults are applied when optional environment variables are missing
	if cfg.APIPort != "8080" {
		t.Errorf("expected default APIPort '8080', got %q", cfg.APIPort)
	}
	if cfg.AppEnv != "development" {
		t.Errorf("expected default AppEnv 'development', got %q", cfg.AppEnv)
	}

	// Test DSN string generation
	expectedDSN := "postgres://testuser:testpass@localhost:5432/testdb?sslmode=disable"
	if dsn := cfg.DSN(); dsn != expectedDSN {
		t.Errorf("expected DSN %q, got %q", expectedDSN, dsn)
	}
}
