package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/service"
)

type contextKey string

const claimsKey contextKey = "claims"

// JWTAuth validates the Bearer token on every protected route.
func JWTAuth(auth *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims, err := auth.ValidateAccessToken(tokenStr)
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromCtx extracts JWT claims from the request context.
// Returns nil if not present (should not happen on protected routes).
func ClaimsFromCtx(r *http.Request) *model.Claims {
	claims, _ := r.Context().Value(claimsKey).(*model.Claims)
	return claims
}
