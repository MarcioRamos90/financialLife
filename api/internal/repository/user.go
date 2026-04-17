package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/marcioramos/financiallife/internal/model"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// GetByEmail returns the user with the given email (excluding soft-deleted).
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	err := r.db.GetContext(ctx, &u,
		r.db.Rebind(`SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`), email)
	if err != nil {
		return nil, fmt.Errorf("GetByEmail: %w", err)
	}
	return &u, nil
}

// GetByID returns the user with the given ID (excluding soft-deleted).
func (r *UserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	var u model.User
	err := r.db.GetContext(ctx, &u,
		r.db.Rebind(`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`), id)
	if err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return &u, nil
}

// StoreRefreshToken persists a hashed refresh token for the user.
func (r *UserRepository) StoreRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	id := newUUID()
	_, err := r.db.ExecContext(ctx,
		r.db.Rebind(`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`),
		id, userID, tokenHash, expiresAt.UTC().Format("2006-01-02 15:04:05"))
	if err != nil {
		return fmt.Errorf("StoreRefreshToken: %w", err)
	}
	return nil
}

// GetRefreshToken returns the user ID if the token exists, is not revoked, and is not expired.
func (r *UserRepository) GetRefreshToken(ctx context.Context, tokenHash string) (string, error) {
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	var userID string
	err := r.db.GetContext(ctx, &userID,
		r.db.Rebind(`SELECT user_id FROM refresh_tokens
		 WHERE token_hash = ?
		 AND   revoked_at IS NULL
		 AND   expires_at > ?`),
		tokenHash, now)
	if err != nil {
		return "", fmt.Errorf("GetRefreshToken: %w", err)
	}
	return userID, nil
}

// RevokeRefreshToken marks a token as revoked.
func (r *UserRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx,
		r.db.Rebind(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?`),
		tokenHash)
	if err != nil {
		return fmt.Errorf("RevokeRefreshToken: %w", err)
	}
	return nil
}

// RevokeAllUserTokens revokes every refresh token for a user (used on logout-all).
func (r *UserRepository) RevokeAllUserTokens(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		r.db.Rebind(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
		 WHERE user_id = ? AND revoked_at IS NULL`),
		userID)
	if err != nil {
		return fmt.Errorf("RevokeAllUserTokens: %w", err)
	}
	return nil
}
