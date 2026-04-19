package repository

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/marcioramos/financiallife/internal/model"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// GetByEmail returns the user with the given email (excluding soft-deleted).
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		return nil, fmt.Errorf("GetByEmail: %w", err)
	}
	return &u, nil
}

// GetByID returns the user with the given ID (excluding soft-deleted).
func (r *UserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	var u model.User
	if err := r.db.WithContext(ctx).First(&u, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return &u, nil
}

// StoreRefreshToken persists a hashed refresh token for the user.
func (r *UserRepository) StoreRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	token := model.RefreshToken{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt.UTC(),
	}
	if err := r.db.WithContext(ctx).Create(&token).Error; err != nil {
		return fmt.Errorf("StoreRefreshToken: %w", err)
	}
	return nil
}

// GetRefreshToken returns the user ID if the token exists, is not revoked, and is not expired.
func (r *UserRepository) GetRefreshToken(ctx context.Context, tokenHash string) (string, error) {
	var token model.RefreshToken
	err := r.db.WithContext(ctx).
		Where("token_hash = ? AND revoked_at IS NULL AND expires_at > ?", tokenHash, time.Now().UTC()).
		First(&token).Error
	if err != nil {
		return "", fmt.Errorf("GetRefreshToken: %w", err)
	}
	return token.UserID, nil
}

// RevokeRefreshToken marks a token as revoked.
func (r *UserRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	now := time.Now().UTC()
	if err := r.db.WithContext(ctx).Model(&model.RefreshToken{}).
		Where("token_hash = ?", tokenHash).
		Update("revoked_at", now).Error; err != nil {
		return fmt.Errorf("RevokeRefreshToken: %w", err)
	}
	return nil
}

// ListByHousehold returns all non-deleted users belonging to the household.
func (r *UserRepository) ListByHousehold(ctx context.Context, householdID string) ([]model.User, error) {
	var users []model.User
	if err := r.db.WithContext(ctx).
		Where("household_id = ?", householdID).
		Find(&users).Error; err != nil {
		return nil, fmt.Errorf("ListByHousehold: %w", err)
	}
	return users, nil
}

// RevokeAllUserTokens revokes every active refresh token for a user.
func (r *UserRepository) RevokeAllUserTokens(ctx context.Context, userID string) error {
	now := time.Now().UTC()
	if err := r.db.WithContext(ctx).Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now).Error; err != nil {
		return fmt.Errorf("RevokeAllUserTokens: %w", err)
	}
	return nil
}
