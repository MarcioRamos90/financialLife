package model

// ImportResult summarises the outcome of a bulk import operation.
type ImportResult struct {
	Imported int              `json:"imported"`
	Skipped  int              `json:"skipped"`
	Errors   []ImportRowError `json:"errors"`
}

// ImportRowError describes a single row that could not be imported.
type ImportRowError struct {
	Row    int    `json:"row"`
	Reason string `json:"reason"`
}
