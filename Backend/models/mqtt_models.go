package models

// AuthRequest is what the ESP32 sends to the backend
type AuthRequest struct {
	Type  string `json:"type"` // "rfid" or "pin"
	Value string `json:"value"`
}

// AuthResponse is what the backend sends back to the ESP32
type AuthResponse struct {
	Status string `json:"status"` // "authorized" or "denied"
	Action string `json:"action"` // "unlock" or "none"
}
