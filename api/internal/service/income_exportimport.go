package service

import (
	"bytes"
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"

	"github.com/marcioramos/financiallife/internal/model"
)

const incomeSheet = "Income Sources"

var incomeHeaders = []string{
	"Name", "Category", "Default Amount", "Currency",
	"Recurrence Day", "Is Joint", "Owner",
}

// ExportXLSX builds an xlsx file from all active income sources for the household.
func (s *IncomeService) ExportXLSX(ctx context.Context, householdID string) ([]byte, error) {
	sources, err := s.repo.ListSources(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("export income sources: %w", err)
	}

	f := excelize.NewFile()
	defer f.Close()

	f.SetSheetName("Sheet1", incomeSheet)

	for col, h := range incomeHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(incomeSheet, cell, h)
	}

	for rowIdx, s := range sources {
		row := rowIdx + 2
		isJoint := "no"
		if s.IsJoint {
			isJoint = "yes"
		}
		values := []any{
			s.Name,
			s.Category,
			s.DefaultAmount,
			s.Currency,
			s.RecurrenceDay,
			isJoint,
			s.OwnerName,
		}
		for col, v := range values {
			cell, _ := excelize.CoordinatesToCellName(col+1, row)
			f.SetCellValue(incomeSheet, cell, v)
		}
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, fmt.Errorf("write xlsx: %w", err)
	}
	return buf.Bytes(), nil
}

// ImportXLSX parses an xlsx file and bulk-creates income sources.
// Rows whose name+owner already exist as an active source are skipped (not errors).
func (s *IncomeService) ImportXLSX(
	ctx context.Context,
	householdID, callerUserID string,
	fileBytes []byte,
	users []model.User,
) (model.ImportResult, error) {
	if len(fileBytes) == 0 {
		return model.ImportResult{}, fmt.Errorf("file is empty")
	}

	f, err := excelize.OpenReader(bytes.NewReader(fileBytes))
	if err != nil {
		return model.ImportResult{}, fmt.Errorf("invalid xlsx file: %w", err)
	}
	defer f.Close()

	if idx, _ := f.GetSheetIndex(incomeSheet); idx == -1 {
		return model.ImportResult{}, fmt.Errorf("sheet named %q not found — please use the template", incomeSheet)
	}
	rows, _ := f.GetRows(incomeSheet)

	usersByName := make(map[string]string)
	for _, u := range users {
		usersByName[strings.ToLower(u.DisplayName)] = u.ID
	}

	// Fetch existing active sources once so we can detect duplicates cheaply.
	existing, err := s.repo.ListSources(ctx, householdID)
	if err != nil {
		return model.ImportResult{}, fmt.Errorf("fetch existing sources: %w", err)
	}
	type dupKey struct{ name, userID string }
	existingSet := make(map[dupKey]bool)
	for _, src := range existing {
		existingSet[dupKey{strings.ToLower(src.Name), src.UserID}] = true
	}

	result := model.ImportResult{Errors: []model.ImportRowError{}}
	for rowIdx, row := range rows {
		if rowIdx == 0 {
			continue
		}
		lineNum := rowIdx + 1

		name := colStr(row, 0)
		category := colStr(row, 1)
		defaultAmountStr := colStr(row, 2)
		currency := colStr(row, 3)
		recurrenceDayStr := colStr(row, 4)
		isJointStr := strings.ToLower(colStr(row, 5))
		ownerNameStr := strings.ToLower(colStr(row, 6))

		if name == "" {
			result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: "name is required"})
			continue
		}

		defaultAmount, parseErr := strconv.ParseFloat(defaultAmountStr, 64)
		if parseErr != nil || defaultAmount < 0 {
			result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: "default_amount must be a number >= 0"})
			continue
		}

		recurrenceDay := 0
		if recurrenceDayStr != "" {
			recurrenceDay, parseErr = strconv.Atoi(recurrenceDayStr)
			if parseErr != nil || recurrenceDay < 0 || recurrenceDay > 31 {
				result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: "recurrence_day must be an integer between 0 and 31"})
				continue
			}
		}

		if currency == "" {
			currency = "BRL"
		}

		userID := callerUserID
		if ownerNameStr != "" {
			if id, ok := usersByName[ownerNameStr]; ok {
				userID = id
			}
		}

		if existingSet[dupKey{strings.ToLower(name), userID}] {
			result.Skipped++
			continue
		}

		req := model.CreateIncomeSourceRequest{
			Name:          name,
			Category:      category,
			DefaultAmount: defaultAmount,
			Currency:      currency,
			RecurrenceDay: recurrenceDay,
			IsJoint:       isJointStr == "yes",
		}
		if _, createErr := s.repo.CreateSource(ctx, householdID, userID, req); createErr != nil {
			result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: "failed to save row"})
			continue
		}
		result.Imported++
	}

	return result, nil
}
