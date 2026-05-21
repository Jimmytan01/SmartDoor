package models

import "time"

// AccessLog represents a single entry in the database
type AccessLog struct {
	ID          int       `json:"id"`
	UserID      *int      `json:"user_id"`
	UserName    *string   `json:"user_name"`
	ScannedRFID *string   `json:"scanned_rfid"`
	EnteredPin  *string   `json:"entered_pin"`
	Status      string    `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}
