package model

import "github.com/golang-jwt/jwt/v5"

// ─── Request / Response DTOs ──────────────────────────────────────────────────

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken string      `json:"access_token"`
	User        UserProfile `json:"user"`
}

type RefreshResponse struct {
	AccessToken string `json:"access_token"`
}

// ─── JWT Claims ───────────────────────────────────────────────────────────────

type Claims struct {
	UserID      string `json:"user_id"`
	HouseholdID string `json:"household_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
	jwt.RegisteredClaims
}

// ─── Generic API envelope ─────────────────────────────────────────────────────

type Response struct {
	Data  any    `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}
