package model

import "testing"

// ─── CreateTransactionRequest.Validate ───────────────────────────────────────

func TestCreateTransactionRequest_Validate(t *testing.T) {
	valid := CreateTransactionRequest{
		Type:            "expense",
		Amount:          50.00,
		TransactionDate: "2024-01-15",
	}

	tests := []struct {
		name    string
		req     CreateTransactionRequest
		wantErr string // empty string means "expect no error"
	}{
		{
			name:    "valid expense",
			req:     valid,
			wantErr: "",
		},
		{
			name:    "valid income",
			req:     CreateTransactionRequest{Type: "income", Amount: 5000, TransactionDate: "2024-01-15"},
			wantErr: "",
		},
		{
			name:    "valid transfer",
			req:     CreateTransactionRequest{Type: "transfer", Amount: 100, TransactionDate: "2024-01-15"},
			wantErr: "",
		},
		{
			name:    "invalid type",
			req:     CreateTransactionRequest{Type: "salary", Amount: 100, TransactionDate: "2024-01-15"},
			wantErr: "type must be income, expense, or transfer",
		},
		{
			name:    "empty type",
			req:     CreateTransactionRequest{Type: "", Amount: 100, TransactionDate: "2024-01-15"},
			wantErr: "type must be income, expense, or transfer",
		},
		{
			name:    "zero amount",
			req:     CreateTransactionRequest{Type: "expense", Amount: 0, TransactionDate: "2024-01-15"},
			wantErr: "amount must be greater than zero",
		},
		{
			name:    "negative amount",
			req:     CreateTransactionRequest{Type: "expense", Amount: -1, TransactionDate: "2024-01-15"},
			wantErr: "amount must be greater than zero",
		},
		{
			name:    "missing transaction date",
			req:     CreateTransactionRequest{Type: "expense", Amount: 100, TransactionDate: ""},
			wantErr: "transaction_date is required (YYYY-MM-DD)",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.req.Validate()
			if got != tc.wantErr {
				t.Errorf("Validate() = %q, want %q", got, tc.wantErr)
			}
		})
	}
}

// ─── UpdateTransactionRequest.Validate ───────────────────────────────────────

func TestUpdateTransactionRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     UpdateTransactionRequest
		wantErr string
	}{
		{
			name:    "valid update",
			req:     UpdateTransactionRequest{Type: "income", Amount: 3000, TransactionDate: "2024-03-01"},
			wantErr: "",
		},
		{
			name:    "invalid type",
			req:     UpdateTransactionRequest{Type: "unknown", Amount: 100, TransactionDate: "2024-03-01"},
			wantErr: "type must be income, expense, or transfer",
		},
		{
			name:    "zero amount",
			req:     UpdateTransactionRequest{Type: "expense", Amount: 0, TransactionDate: "2024-03-01"},
			wantErr: "amount must be greater than zero",
		},
		{
			name:    "missing date",
			req:     UpdateTransactionRequest{Type: "expense", Amount: 50, TransactionDate: ""},
			wantErr: "transaction_date is required (YYYY-MM-DD)",
		},
		{
			name:    "very small positive amount is valid",
			req:     UpdateTransactionRequest{Type: "expense", Amount: 0.01, TransactionDate: "2024-03-01"},
			wantErr: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.req.Validate()
			if got != tc.wantErr {
				t.Errorf("Validate() = %q, want %q", got, tc.wantErr)
			}
		})
	}
}
