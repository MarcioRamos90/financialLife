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

const txSheet = "Transactions"

var txHeaders = []string{
	"Date", "Type", "Amount", "Currency",
	"Description", "Category", "Is Joint",
	"Payment Method", "Recorded By",
}

// ExportXLSX builds an xlsx file from the transactions matching the given filters.
func (s *TransactionService) ExportXLSX(ctx context.Context, householdID string, filters model.TransactionFilters) ([]byte, error) {
	txs, err := s.repo.List(ctx, householdID, filters)
	if err != nil {
		return nil, fmt.Errorf("export transactions: %w", err)
	}

	f := excelize.NewFile()
	defer f.Close()

	f.SetSheetName("Sheet1", txSheet)

	for col, h := range txHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(txSheet, cell, h)
	}

	for rowIdx, tx := range txs {
		row := rowIdx + 2
		isJoint := "no"
		if tx.IsJoint {
			isJoint = "yes"
		}
		pmName := ""
		if tx.PaymentMethodName != nil {
			pmName = *tx.PaymentMethodName
		}
		values := []any{
			tx.TransactionDate,
			tx.Type,
			tx.Amount,
			tx.Currency,
			tx.Description,
			tx.Category,
			isJoint,
			pmName,
			tx.RecordedByName,
		}
		for col, v := range values {
			cell, _ := excelize.CoordinatesToCellName(col+1, row)
			f.SetCellValue(txSheet, cell, v)
		}
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, fmt.Errorf("write xlsx: %w", err)
	}
	return buf.Bytes(), nil
}

// ImportXLSX parses an xlsx file and bulk-creates transactions.
// Each row is processed independently; a row-level error never blocks the rest.
// accountID is the default account assigned to every imported transaction.
// users and paymentMethods are used to resolve display names / method names to IDs.
func (s *TransactionService) ImportXLSX(
	ctx context.Context,
	householdID, callerUserID, accountID string,
	fileBytes []byte,
	users []model.User,
	paymentMethods []model.PaymentMethod,
) (model.ImportResult, error) {
	if len(fileBytes) == 0 {
		return model.ImportResult{}, fmt.Errorf("file is empty")
	}

	f, err := excelize.OpenReader(bytes.NewReader(fileBytes))
	if err != nil {
		return model.ImportResult{}, fmt.Errorf("invalid xlsx file: %w", err)
	}
	defer f.Close()

	if idx, _ := f.GetSheetIndex(txSheet); idx == -1 {
		return model.ImportResult{}, fmt.Errorf("sheet named %q not found — please use the template", txSheet)
	}
	rows, _ := f.GetRows(txSheet)

	usersByName := make(map[string]string)
	for _, u := range users {
		usersByName[strings.ToLower(u.DisplayName)] = u.ID
	}
	pmByName := make(map[string]string)
	for _, pm := range paymentMethods {
		pmByName[strings.ToLower(pm.Name)] = pm.ID
	}

	result := model.ImportResult{Errors: []model.ImportRowError{}}
	for rowIdx, row := range rows {
		if rowIdx == 0 {
			continue // skip header
		}
		lineNum := rowIdx + 1

		dateStr := colStr(row, 0)
		typeStr := strings.ToLower(colStr(row, 1))
		amountStr := colStr(row, 2)
		currency := colStr(row, 3)
		description := colStr(row, 4)
		category := colStr(row, 5)
		isJointStr := strings.ToLower(colStr(row, 6))
		pmNameStr := strings.ToLower(colStr(row, 7))
		ownerNameStr := strings.ToLower(colStr(row, 8))

		if dateStr == "" {
			result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: "date is required"})
			continue
		}
		if typeStr != "income" && typeStr != "expense" && typeStr != "transfer" {
			result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: fmt.Sprintf("invalid type %q: must be income, expense, or transfer", typeStr)})
			continue
		}
		amount, parseErr := strconv.ParseFloat(amountStr, 64)
		if parseErr != nil || amount <= 0 {
			result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: "amount must be a number greater than zero"})
			continue
		}
		if currency == "" {
			currency = "BRL"
		}

		var pmID *string
		if pmNameStr != "" {
			if id, ok := pmByName[pmNameStr]; ok {
				pmID = &id
			}
		}

		userID := callerUserID
		if ownerNameStr != "" {
			if id, ok := usersByName[ownerNameStr]; ok {
				userID = id
			}
		}

		req := model.CreateTransactionRequest{
			AccountID:       accountID,
			Type:            typeStr,
			Amount:          amount,
			Currency:        currency,
			Description:     description,
			Category:        category,
			IsJoint:         isJointStr == "yes",
			PaymentMethodID: pmID,
			TransactionDate: dateStr,
		}
		if _, createErr := s.repo.Create(ctx, householdID, userID, req); createErr != nil {
			result.Errors = append(result.Errors, model.ImportRowError{Row: lineNum, Reason: "failed to save row"})
			continue
		}
		result.Imported++
	}

	return result, nil
}

// colStr safely reads a cell string from a row, returning "" if out of bounds.
func colStr(row []string, idx int) string {
	if idx < len(row) {
		return strings.TrimSpace(row[idx])
	}
	return ""
}
