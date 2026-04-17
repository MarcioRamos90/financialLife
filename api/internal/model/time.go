package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// DBTime wraps time.Time so it can be scanned from both PostgreSQL (returns
// a native time.Time value) and SQLite (returns a string in RFC3339 or
// "YYYY-MM-DD HH:MM:SS" format).
//
// All time.Time methods are available via embedding, so callers can use
// t.Before(), t.Format(), etc. without any changes.
type DBTime struct {
	time.Time
}

// Scan implements sql.Scanner.
func (t *DBTime) Scan(src any) error {
	switch v := src.(type) {
	case time.Time:
		t.Time = v
	case string:
		parsed, err := time.Parse(time.RFC3339, v)
		if err != nil {
			// Fallback for "YYYY-MM-DD HH:MM:SS" (SQLite CURRENT_TIMESTAMP format)
			parsed, err = time.Parse("2006-01-02 15:04:05", v)
			if err != nil {
				return fmt.Errorf("DBTime.Scan: cannot parse %q: %w", v, err)
			}
		}
		t.Time = parsed.UTC()
	case nil:
		t.Time = time.Time{}
	default:
		return fmt.Errorf("DBTime.Scan: unsupported source type %T", src)
	}
	return nil
}

// Value implements driver.Valuer so DBTime can be used as a query parameter.
func (t DBTime) Value() (driver.Value, error) {
	return t.Time, nil
}

// MarshalJSON delegates to time.Time so the JSON output is identical.
func (t DBTime) MarshalJSON() ([]byte, error) {
	return json.Marshal(t.Time)
}
