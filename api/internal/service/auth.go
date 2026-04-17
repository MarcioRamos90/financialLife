package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

type AuthService struct {
	users                *repository.UserRepository
	jwtSecret            []byte
	accessTokenDuration  time.Duration
	refreshTokenDuration time.Duration
}

func NewAuthService(
	users *repository.UserRepository,
	jwtSecret string,
	accessExpiry string,
	refreshExpiry string,
) (*AuthService, error) {
	accessDur, err := time.ParseDuration(accessExpiry)
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_ACCESS_TOKEN_EXPIRY: %w", err)
	}
	refreshDur, err := time.ParseDuration(refreshExpiry)
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_REFRESH_TOKEN_EXPIRY: %w", err)
	}
	return &AuthService{
		users:                users,
		jwtSecret:            []byte(jwtSecret),
		accessTokenDuration:  accessDur,
		refreshTokenDuration: refreshDur,
	}, nil
}

// Login validates credentials and returns an access token + raw refresh token.
func (s *AuthService) Login(ctx context.Context, email, password string) (accessToken, refreshToken string, user *model.User, err error) {
	user, err = s.users.GetByEmail(ctx, email)
	if err != nil {
		return "", "", nil, ErrInvalidCredentials
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", "", nil, ErrInvalidCredentials
	}

	accessToken, err = s.generateAccessToken(user)
	if err != nil {
		return "", "", nil, fmt.Errorf("generateAccessToken: %w", err)
	}

	refreshToken, err = s.generateAndStoreRefreshToken(ctx, user.ID)
	if err != nil {
		return "", "", nil, fmt.Errorf("generateRefreshToken: %w", err)
	}

	return accessToken, refreshToken, user, nil
}

// Refresh validates a refresh token and issues a new access token.
func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (string, *model.User, error) {
	tokenHash := hashToken(rawRefreshToken)

	userID, err := s.users.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return "", nil, ErrInvalidToken
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return "", nil, ErrInvalidToken
	}

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return "", nil, fmt.Errorf("generateAccessToken: %w", err)
	}

	return accessToken, user, nil
}

// Logout revokes the given refresh token.
func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	tokenHash := hashToken(rawRefreshToken)
	return s.users.RevokeRefreshToken(ctx, tokenHash)
}

// ValidateAccessToken parses and validates a JWT, returning the claims.
func (s *AuthService) ValidateAccessToken(tokenString string) (*model.Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &model.Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*model.Claims)
	if !ok {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// ─── private helpers ──────────────────────────────────────────────────────────

func (s *AuthService) generateAccessToken(user *model.User) (string, error) {
	claims := model.Claims{
		UserID:      user.ID,
		HouseholdID: user.HouseholdID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessTokenDuration)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) generateAndStoreRefreshToken(ctx context.Context, userID string) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	rawToken := hex.EncodeToString(raw)
	tokenHash := hashToken(rawToken)
	expiresAt := time.Now().Add(s.refreshTokenDuration).UTC().Format(time.RFC3339)

	if err := s.users.StoreRefreshToken(ctx, userID, tokenHash, expiresAt); err != nil {
		return "", err
	}
	return rawToken, nil
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}
