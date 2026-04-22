package model

import "testing"

// ─── CreateAccountRequest.Validate ───────────────────────────────────────────

func TestCreateAccountRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateAccountRequest
		wantErr string
	}{
		{
			name:    "valid checking",
			req:     CreateAccountRequest{Name: "Main Checking", Type: "checking"},
			wantErr: "",
		},
		{
			name:    "valid savings",
			req:     CreateAccountRequest{Name: "Emergency Fund", Type: "savings"},
			wantErr: "",
		},
		{
			name:    "valid cash",
			req:     CreateAccountRequest{Name: "Wallet", Type: "cash"},
			wantErr: "",
		},
		{
			name:    "valid investment",
			req:     CreateAccountRequest{Name: "Stocks", Type: "investment"},
			wantErr: "",
		},
		{
			name:    "valid other",
			req:     CreateAccountRequest{Name: "Misc", Type: "other"},
			wantErr: "",
		},
		{
			name:    "missing name",
			req:     CreateAccountRequest{Name: "", Type: "cash"},
			wantErr: "name is required",
		},
		{
			name:    "invalid type",
			req:     CreateAccountRequest{Name: "Test", Type: "credit_card"},
			wantErr: "type must be checking, savings, cash, investment, or other",
		},
		{
			name:    "empty type",
			req:     CreateAccountRequest{Name: "Test", Type: ""},
			wantErr: "type must be checking, savings, cash, investment, or other",
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

// ─── UpdateAccountRequest.Validate ───────────────────────────────────────────

func TestUpdateAccountRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     UpdateAccountRequest
		wantErr string
	}{
		{
			name:    "valid update",
			req:     UpdateAccountRequest{Name: "Updated Name", Type: "savings"},
			wantErr: "",
		},
		{
			name:    "missing name",
			req:     UpdateAccountRequest{Name: "", Type: "cash"},
			wantErr: "name is required",
		},
		{
			name:    "invalid type",
			req:     UpdateAccountRequest{Name: "Test", Type: "unknown"},
			wantErr: "type must be checking, savings, cash, investment, or other",
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
