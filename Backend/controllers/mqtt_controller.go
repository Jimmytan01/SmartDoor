package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"smartdoor/models"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/jackc/pgx/v5/pgxpool"
)

// HandleESPRequest is triggered every time the ESP32 publishes to smartdoor/auth/request
func HandleESPRequest(db *pgxpool.Pool) mqtt.MessageHandler {
	return func(client mqtt.Client, msg mqtt.Message) {
		var req models.AuthRequest

		// 1. Parse the incoming JSON from the ESP32
		if err := json.Unmarshal(msg.Payload(), &req); err != nil {
			log.Println("Invalid MQTT payload:", err)
			return
		}

		fmt.Printf("Received scan: Type=%s, Value=%s\n", req.Type, req.Value)

		authorized := false
		var userID *int // Pointer because it might be null if unauthorized
		logStatus := "DENIED"

		// 2. Check the database based on whether it's an RFID or PIN
		if req.Type == "rfid" {
			err := db.QueryRow(context.Background(),
				"SELECT id FROM users WHERE rfid_tag=$1 AND is_active=true", req.Value).Scan(&userID)

			if err == nil {
				authorized = true
				logStatus = "RFID_GRANTED"
			} else {
				logStatus = "DENIED_UNKNOWN_CARD"
			}
		} else if req.Type == "pin" {
			var correctPin string
			err := db.QueryRow(context.Background(),
				"SELECT setting_value FROM system_settings WHERE setting_key='universal_pin'").Scan(&correctPin)

			if err == nil && correctPin == req.Value {
				authorized = true
				logStatus = "PIN_GRANTED"
			} else {
				logStatus = "DENIED_WRONG_PIN"
			}
		}

		// 3. Log the attempt into the database
		var rfidLog, pinLog *string
		if req.Type == "rfid" {
			rfidLog = &req.Value
		}
		if req.Type == "pin" {
			pinLog = &req.Value
		}

		_, err := db.Exec(context.Background(),
			"INSERT INTO access_logs (user_id, scanned_rfid, entered_pin, status) VALUES ($1, $2, $3, $4)",
			userID, rfidLog, pinLog, logStatus)
		if err != nil {
			log.Println("Failed to save access log:", err)
		}

		// 4. Send the decision back to the ESP32
		res := models.AuthResponse{
			Status: "denied",
			Action: "none",
		}
		if authorized {
			res.Status = "authorized"
			res.Action = "unlock"
			fmt.Println("Access Granted! Unlocking door...")
		} else {
			fmt.Println("Access Denied!")
		}

		payload, _ := json.Marshal(res)
		client.Publish("smartdoor/auth/response", 0, false, payload)
	}
}
