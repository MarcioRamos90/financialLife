package model

import "testing"

// ─── CreateIncomeSourceRequest.Validate ──────────────────────────────────────

func TestCreateIncomeSourceRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateIncomeSourceRequest
		wantErr string
	}{
		{
			name:    "valid minimal",
			req:     CreateIncomeSourceRequest{Name: "Salary"},
			wantErr: "",
		},
		{
			name:    "valid with all fields",
			req:     CreateIncomeSourceRequest{Name: "Freelance", Category: "Other", DefaultAmount: 3000, Currency: "BRL", RecurrenceDay: 5, IsJoint: false},
			wantErr: "",
		},
		{
			name:    "valid joint source",
			req:     CreateIncomeSourceRequest{Name: "Rent Income", DefaultAmount: 2000, IsJoint: true},
			wantErr: "",
		},
		{
			name:    "missing name",
			req:     CreateIncomeSourceRequest{Name: "", DefaultAmount: 1000},
			wantErr: "name is required",
		},
		{
			name:    "negative default amount",
			req:     CreateIncomeSourceRequest{Name: "Salary", DefaultAmount: -1},
			wantErr: "default_amount must be zero or greater",
		},
		{
			name:    "zero default amount is allowed",
			req:     CreateIncomeSourceRequest{Name: "Salary", DefaultAmount: 0},
			wantErr: "",
		},
		{
			name:    "recurrence day 32 is invalid",
			req:     CreateIncomeSourceRequest{Name: "Salary", RecurrenceDay: 32},
			wantErr: "recurrence_day must be between 0 and 31",
		},
		{
			name:    "recurrence day -1 is invalid",
			req:     CreateIncomeSourceRequest{Name: "Salary", RecurrenceDay: -1},
			wantErr: "recurrence_day must be between 0 and 31",
		},
		{
			name:    "recurrence day 0 means unset (valid)",
			req:     CreateIncomeSourceRequest{Name: "Salary", RecurrenceDay: 0},
			wantErr: "",
		},
		{
			name:    "recurrence day 31 is valid",
			req:     CreateIncomeSourceRequest{Name: "Salary", RecurrenceDay: 31},
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

// ─── UpdateIncomeSourceRequest.Validate ──────────────────────────────────────

func TestUpdateIncomeSourceRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     UpdateIncomeSourceRequest
		wantErr string
	}{
		{
			name:    "valid update",
			req:     UpdateIncomeSourceRequest{Name: "Consulting", DefaultAmount: 5000},
			wantErr: "",
		},
		{
			name:    "missing name",
			req:     UpdateIncomeSourceRequest{Name: ""},
			wantErr: "name is required",
		},
		{
			name:    "negative amount",
			req:     UpdateIncomeSourceRequest{Name: "Salary", DefaultAmount: -100},
			wantErr: "default_amount must be zero or greater",
		},
		{
			name:    "recurrence day out of range",
			req:     UpdateIncomeSourceRequest{Name: "Salary", RecurrenceDay: 32},
			wantErr: "recurrence_day must be between 0 and 31",
		},
		{
			name:    "valid recurrence day boundary",
			req:     UpdateIncomeSourceRequest{Name: "Salary", RecurrenceDay: 1},
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

// ─── CreateIncomeEntryRequest.Validate ───────────────────────────────────────

func TestCreateIncomeEntryRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateIncomeEntryRequest
		wantErr string
	}{
		{
			name:    "valid entry",
			req:     CreateIncomeEntryRequest{Year: 2025, Month: 1, ReceivedAmount: 4500},
			wantErr: "",
		},
		{
			name:    "valid all months",
			req:     CreateIncomeEntryRequest{Year: 2024, Month: 12, ReceivedAmount: 0},
			wantErr: "",
		},
		{
			name:    "zero received amount is allowed",
			req:     CreateIncomeEntryRequest{Year: 2025, Month: 6, ReceivedAmount: 0},
			wantErr: "",
		},
		{
			name:    "year too low",
			req:     CreateIncomeEntryRequest{Year: 1999, Month: 1, ReceivedAmount: 100},
			wantErr: "year is invalid",
		},
		{
			name:    "year too high",
			req:     CreateIncomeEntryRequest{Year: 2101, Month: 1, ReceivedAmount: 100},
			wantErr: "year is invalid",
		},
		{
			name:    "year 2000 is valid boundary",
			req:     CreateIncomeEntryRequest{Year: 2000, Month: 1, ReceivedAmount: 100},
			wantErr: "",
		},
		{
			name:    "year 2100 is valid boundary",
			req:     CreateIncomeEntryRequest{Year: 2100, Month: 6, ReceivedAmount: 100},
			wantErr: "",
		},
		{
			name:    "month 0 is invalid",
			req:     CreateIncomeEntryRequest{Year: 2025, Month: 0, ReceivedAmount: 100},
			wantErr: "month must be between 1 and 12",
		},
		{
			name:    "month 13 is invalid",
			req:     CreateIncomeEntryRequest{Year: 2025, Month: 13, ReceivedAmount: 100},
			wantErr: "month must be between 1 and 12",
		},
		{
			name:    "negative received amount",
			req:     CreateIncomeEntryRequest{Year: 2025, Month: 3, ReceivedAmount: -50},
			wantErr: "received_amount must be zero or greater",
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
