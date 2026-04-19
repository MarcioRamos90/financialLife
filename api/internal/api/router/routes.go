package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"gorm.io/gorm"

	"github.com/marcioramos/financiallife/internal/api/handlers"
	"github.com/marcioramos/financiallife/internal/api/middleware"
	"github.com/marcioramos/financiallife/internal/config"
	"github.com/marcioramos/financiallife/internal/repository"
	"github.com/marcioramos/financiallife/internal/service"
)

func New(cfg *config.Config, db *gorm.DB) http.Handler {
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
	userRepo   := repository.NewUserRepository(db)
	txRepo     := repository.NewTransactionRepository(db)
	incomeRepo := repository.NewIncomeRepository(db)

	authSvc, err := service.NewAuthService(
		userRepo, cfg.JWTSecret,
		cfg.JWTAccessTokenExpiry, cfg.JWTRefreshTokenExpiry,
	)
	if err != nil {
		panic("failed to init auth service: " + err.Error())
	}
	txSvc     := service.NewTransactionService(txRepo)
	incomeSvc := service.NewIncomeService(incomeRepo)

	authHandler         := handlers.NewAuthHandler(authSvc)
	txHandler           := handlers.NewTransactionHandler(txSvc)
	incomeHandler       := handlers.NewIncomeHandler(incomeSvc)
	importExportHandler := handlers.NewImportExportHandler(txSvc, incomeSvc, userRepo, txRepo)

	// ── Health ────────────────────────────────────────────────────────────────
	r.Get("/health", handlers.Health)

	// ── Test helpers (not available in production) ───────────────────────────
	if cfg.AppEnv != "production" {
		r.Post("/api/v1/test/reset", handlers.NewTestResetHandler(db))
	}

	// ── API v1 ────────────────────────────────────────────────────────────────
	r.Route("/api/v1", func(r chi.Router) {

		// Public auth
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login",   authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout",  authHandler.Logout)
		})

		// Protected
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(authSvc))

			// Auth
			r.Get("/auth/me", authHandler.Me)

			// Transactions — static routes before {id} to avoid Chi matching export/import as a param
			r.Get("/transactions",                          txHandler.List)
			r.Post("/transactions",                         txHandler.Create)
			r.Get("/transactions/payment-methods",          txHandler.ListPaymentMethods)
			r.Get("/transactions/export",                   importExportHandler.ExportTransactions)
			r.Get("/transactions/export/template",          importExportHandler.TransactionTemplate)
			r.Post("/transactions/import",                  importExportHandler.ImportTransactions)
			r.Put("/transactions/{id}",                     txHandler.Update)
			r.Delete("/transactions/{id}",                  txHandler.Delete)

			// Income sources — static routes before {id}
			r.Get("/income-sources",                        incomeHandler.ListSources)
			r.Post("/income-sources",                       incomeHandler.CreateSource)
			r.Get("/income-sources/export",                 importExportHandler.ExportIncomeSources)
			r.Get("/income-sources/export/template",        importExportHandler.IncomeSourceTemplate)
			r.Post("/income-sources/import",                importExportHandler.ImportIncomeSources)
			r.Put("/income-sources/{id}",                   incomeHandler.UpdateSource)
			r.Delete("/income-sources/{id}",                incomeHandler.DeleteSource)
			r.Post("/income-sources/{id}/entries",          incomeHandler.RecordEntry)
			r.Get("/income-sources/{id}/history",           incomeHandler.ListHistory)

			// TODO Week 5
			r.Get("/allocations/rules",   http.NotFound)
			r.Post("/allocations/rules",  http.NotFound)
			r.Get("/allocations/preview", http.NotFound)

			// TODO Week 6
			r.Get("/reports/monthly/{year}/{month}", http.NotFound)
		})
	})

	return r
}
