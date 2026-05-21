package models

import "time"

// User represents an authorized person in the system
type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name" binding:"required"`
	RFIDTag   *string   `json:"rfid_tag"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}
