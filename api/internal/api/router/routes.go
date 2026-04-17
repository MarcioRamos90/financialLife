package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jmoiron/sqlx"

	"github.com/marcioramos/financiallife/internal/api/handlers"
	"github.com/marcioramos/financiallife/internal/api/middleware"
	"github.com/marcioramos/financiallife/internal/config"
	"github.com/marcioramos/financiallife/internal/repository"
	"github.com/marcioramos/financiallife/internal/service"
)

// New builds and returns the application router.
func New(cfg *config.Config, db *sqlx.DB) http.Handler {
	r := chi.NewRouter()

	// ── Global middleware ─────────────────────────────────────────────────────
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.CORSAllowedOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// ── Dependencies ──────────────────────────────────────────────────────────
	userRepo := repository.NewUserRepository(db)

	authSvc, err := service.NewAuthService(
		userRepo,
		cfg.JWTSecret,
		cfg.JWTAccessTokenExpiry,
		cfg.JWTRefreshTokenExpiry,
	)
	if err != nil {
		panic("failed to init auth service: " + err.Error())
	}

	authHandler := handlers.NewAuthHandler(authSvc)

	// ── Health check ──────────────────────────────────────────────────────────
	r.Get("/health", handlers.Health)

	// ── API v1 ────────────────────────────────────────────────────────────────
	r.Route("/api/v1", func(r chi.Router) {

		// Public auth routes
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login",   authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout",  authHandler.Logout)
		})

		// Protected routes (JWT required)
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(authSvc))

			r.Get("/auth/me", authHandler.Me)

			r.Get("/transactions",  http.NotFound) // TODO Week 3
			r.Post("/transactions", http.NotFound) // TODO Week 3

			r.Get("/income-sources",  http.NotFound) // TODO Week 4
			r.Post("/income-sources", http.NotFound) // TODO Week 4

			r.Get("/allocations/rules",   http.NotFound) // TODO Week 5
			r.Post("/allocations/rules",  http.NotFound) // TODO Week 5
			r.Get("/allocations/preview", http.NotFound) // TODO Week 5

			r.Get("/reports/monthly/{year}/{month}", http.NotFound) // TODO Week 6
		})
	})

	return r
}
