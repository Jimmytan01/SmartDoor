package controllers

import (
	"context"
	"net/http"
	"smartdoor/models"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetLogs fetches the most recent access logs from the database
func GetLogs(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		query := `
			SELECT 
				a.id, a.user_id, u.name as user_name, a.scanned_rfid, a.entered_pin, a.status, a.timestamp 
			FROM 
				access_logs a
			LEFT JOIN 
				users u ON a.user_id = u.id
			ORDER BY 
				a.timestamp DESC 
			LIMIT 50
		`

		rows, err := db.Query(context.Background(), query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query database"})
			return
		}
		defer rows.Close()

		var logs []models.AccessLog

		for rows.Next() {
			var log models.AccessLog
			// --- PASTIKAN URUTAN SCAN SAMA DENGAN URUTAN SELECT DI ATAS ---
			err := rows.Scan(&log.ID, &log.UserID, &log.UserName, &log.ScannedRFID, &log.EnteredPin, &log.Status, &log.Timestamp)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse data"})
				return
			}
			logs = append(logs, log)
		}

		c.JSON(http.StatusOK, logs)
	}
}

func GetLatestUnknownScan(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var rfidTag string

		// Cari 1 log terakhir yang statusnya kartu tidak dikenal
		query := `
			SELECT scanned_rfid 
			FROM access_logs 
			WHERE status = 'DENIED_UNKNOWN_CARD' AND scanned_rfid IS NOT NULL AND timestamp >= NOW() - INTERVAL '1 minute' 
			ORDER BY timestamp DESC 
			LIMIT 1
		`

		err := db.QueryRow(context.Background(), query).Scan(&rfidTag)

		if err != nil {
			// Jika belum ada kartu yang di-tap sama sekali
			c.JSON(http.StatusNotFound, gin.H{"error": "Belum ada kartu baru yang di-scan"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"rfid_tag": rfidTag})
	}
}
