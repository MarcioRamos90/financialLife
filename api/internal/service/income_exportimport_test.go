package service

import (
	"bytes"
	"context"
	"testing"

	"github.com/xuri/excelize/v2"

	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/repository"
	"github.com/marcioramos/financiallife/internal/testutil"
)

// ─── helpers ──────────────────────────────────────────────────────────────────

func newIncomeService(t *testing.T) (*IncomeService, testutil.Seeds) {
	t.Helper()
	db, seeds := testutil.NewDB(t)
	return NewIncomeService(repository.NewIncomeRepository(db)), seeds
}

// buildIncomeXLSX creates an in-memory xlsx with the given data rows.
// Columns: Name, Category, Default Amount, Currency, Recurrence Day, Is Joint, Owner
func buildIncomeXLSX(t *testing.T, rows [][]any) []byte {
	t.Helper()
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", incomeSheet)
	headers := []any{"Name", "Category", "Default Amount", "Currency", "Recurrence Day", "Is Joint", "Owner"}
	for col, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(incomeSheet, cell, h)
	}
	for rowIdx, row := range rows {
		for col, v := range row {
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			f.SetCellValue(incomeSheet, cell, v)
		}
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatalf("buildIncomeXLSX: %v", err)
	}
	return buf.Bytes()
}

// ─── Export tests ─────────────────────────────────────────────────────────────

func TestExportIncomeSourcesEmpty(t *testing.T) {
	svc, seeds := newIncomeService(t)
	data, err := svc.ExportXLSX(context.Background(), seeds.HouseholdID)
	if err != nil {
		t.Fatalf("ExportXLSX: %v", err)
	}
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("open xlsx: %v", err)
	}
	rows, _ := f.GetRows(incomeSheet)
	if len(rows) != 1 {
		t.Errorf("got %d rows, want 1 (header only)", len(rows))
	}
	if rows[0][0] != "Name" {
		t.Errorf("first header = %q, want Name", rows[0][0])
	}
}

func TestExportIncomeSourcesData(t *testing.T) {
	svc, seeds := newIncomeService(t)
	ctx := context.Background()

	for _, req := range []model.CreateIncomeSourceRequest{
		{Name: "Salary",   DefaultAmount: 5000, Category: "Work",     IsJoint: false},
		{Name: "Freelance", DefaultAmount: 1500, Category: "Work",     IsJoint: false},
		{Name: "Rent",     DefaultAmount: 2000, Category: "Household", IsJoint: true, RecurrenceDay: 5},
	} {
		if _, err := svc.CreateSource(ctx, seeds.HouseholdID, seeds.UserID, req); err != nil {
			t.Fatalf("CreateSource: %v", err)
		}
	}

	data, err := svc.ExportXLSX(ctx, seeds.HouseholdID)
	if err != nil {
		t.Fatalf("ExportXLSX: %v", err)
	}
	f, _ := excelize.OpenReader(bytes.NewReader(data))
	rows, _ := f.GetRows(incomeSheet)

	if len(rows) != 4 { // header + 3 data rows
		t.Errorf("got %d rows, want 4", len(rows))
	}
	// Row 4 (index 3) is "Rent" — IsJoint=true, RecurrenceDay=5
	if len(rows) >= 4 {
		if rows[3][5] != "yes" {
			t.Errorf("is_joint = %q, want yes", rows[3][5])
		}
		if rows[3][4] != "5" {
			t.Errorf("recurrence_day = %q, want 5", rows[3][4])
		}
	}
}

// ─── Import tests ─────────────────────────────────────────────────────────────

func TestImportIncomeSourcesValid(t *testing.T) {
	svc, seeds := newIncomeService(t)
	data := buildIncomeXLSX(t, [][]any{
		{"Salary",    "Work",      5000.0, "BRL", 0, "no", ""},
		{"Freelance", "Work",      1500.0, "BRL", 0, "no", ""},
	})

	result, err := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, data, nil)
	if err != nil {
		t.Fatalf("ImportXLSX: %v", err)
	}
	if result.Imported != 2 {
		t.Errorf("imported = %d, want 2", result.Imported)
	}
	if len(result.Errors) != 0 {
		t.Errorf("errors = %v, want none", result.Errors)
	}
}

func TestImportIncomeSourcesDuplicateName(t *testing.T) {
	svc, seeds := newIncomeService(t)
	ctx := context.Background()

	// Pre-create the source
	svc.CreateSource(ctx, seeds.HouseholdID, seeds.UserID, model.CreateIncomeSourceRequest{
		Name: "Salary", DefaultAmount: 5000,
	})

	data := buildIncomeXLSX(t, [][]any{
		{"Salary",    "Work", 5000.0, "BRL", 0, "no", ""},
		{"Freelance", "Work", 1500.0, "BRL", 0, "no", ""},
	})

	result, err := svc.ImportXLSX(ctx, seeds.HouseholdID, seeds.UserID, data, nil)
	if err != nil {
		t.Fatalf("ImportXLSX: %v", err)
	}
	if result.Imported != 1 {
		t.Errorf("imported = %d, want 1", result.Imported)
	}
	if result.Skipped != 1 {
		t.Errorf("skipped = %d, want 1", result.Skipped)
	}
	if len(result.Errors) != 0 {
		t.Errorf("errors = %v, want none", result.Errors)
	}
}

func TestImportIncomeSourcesInvalidDefaultAmount(t *testing.T) {
	svc, seeds := newIncomeService(t)
	data := buildIncomeXLSX(t, [][]any{
		{"Salary", "Work", -100.0, "BRL", 0, "no", ""},
		{"Other",  "Work",  500.0, "BRL", 0, "no", ""},
	})

	result, _ := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, data, nil)
	if result.Imported != 1 {
		t.Errorf("imported = %d, want 1", result.Imported)
	}
	if len(result.Errors) != 1 {
		t.Errorf("errors = %d, want 1", len(result.Errors))
	}
}

func TestImportIncomeSourcesInvalidRecurrenceDay(t *testing.T) {
	svc, seeds := newIncomeService(t)
	data := buildIncomeXLSX(t, [][]any{
		{"Salary", "Work", 5000.0, "BRL", 99, "no", ""},
		{"Bonus",  "Work",  500.0, "BRL",  0, "no", ""},
	})

	result, _ := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, data, nil)
	if result.Imported != 1 {
		t.Errorf("imported = %d, want 1", result.Imported)
	}
	if len(result.Errors) != 1 {
		t.Errorf("errors = %d, want 1", len(result.Errors))
	}
}

func TestImportIncomeSourcesUnknownOwnerFallback(t *testing.T) {
	svc, seeds := newIncomeService(t)
	data := buildIncomeXLSX(t, [][]any{
		{"Salary", "Work", 5000.0, "BRL", 0, "no", "nobody"},
	})

	result, err := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, data, nil)
	if err != nil {
		t.Fatalf("ImportXLSX: %v", err)
	}
	if result.Imported != 1 {
		t.Errorf("imported = %d, want 1 (should fallback to caller)", result.Imported)
	}
}

func TestImportIncomeSourcesMissingName(t *testing.T) {
	svc, seeds := newIncomeService(t)
	data := buildIncomeXLSX(t, [][]any{
		{"",       "Work", 5000.0, "BRL", 0, "no", ""},
		{"Salary", "Work",  500.0, "BRL", 0, "no", ""},
	})

	result, _ := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, data, nil)
	if result.Imported != 1 {
		t.Errorf("imported = %d, want 1", result.Imported)
	}
	if len(result.Errors) != 1 {
		t.Errorf("errors = %d, want 1", len(result.Errors))
	}
}

func TestImportIncomeSourcesEmptyFile(t *testing.T) {
	svc, seeds := newIncomeService(t)
	_, err := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, []byte{}, nil)
	if err == nil {
		t.Fatal("expected error for empty file bytes, got nil")
	}
}

func TestImportIncomeSourcesWrongSheetName(t *testing.T) {
	svc, seeds := newIncomeService(t)

	// Build an xlsx with a sheet named something other than "Income Sources"
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", "Planilha1")
	f.SetCellValue("Planilha1", "A1", "Name")
	f.SetCellValue("Planilha1", "A2", "Salary")
	buf, _ := f.WriteToBuffer()

	_, err := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, buf.Bytes(), nil)
	if err == nil {
		t.Fatal("expected error for wrong sheet name, got nil")
	}
}

func TestImportIncomeSourcesErrorsIsNeverNil(t *testing.T) {
	svc, seeds := newIncomeService(t)
	data := buildIncomeXLSX(t, [][]any{
		{"Salary", "Work", 5000.0, "BRL", 0, "no", ""},
	})

	result, err := svc.ImportXLSX(context.Background(), seeds.HouseholdID, seeds.UserID, data, nil)
	if err != nil {
		t.Fatalf("ImportXLSX: %v", err)
	}
	if result.Errors == nil {
		t.Error("Errors field is nil; expected an initialised (non-nil) slice")
	}
}
