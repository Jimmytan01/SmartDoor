package controllers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PinUpdateRequest defines the JSON payload expected from the frontend
type PinUpdateRequest struct {
	NewPin string `json:"new_pin" binding:"required"`
}

// UpdateUniversalPin updates the universal fallback PIN in the database
func UpdateUniversalPin(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input PinUpdateRequest

		// 1. Parse the incoming JSON
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. 'new_pin' is required."})
			return
		}

		// 2. Update the setting in the database
		query := `
			UPDATE system_settings 
			SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
			WHERE setting_key = 'universal_pin'
		`

		commandTag, err := db.Exec(context.Background(), query, input.NewPin)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update database"})
			return
		}

		// Check if the row actually existed to be updated
		if commandTag.RowsAffected() == 0 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "System setting 'universal_pin' not found"})
			return
		}

		// 3. Return a success confirmation
		c.JSON(http.StatusOK, gin.H{
			"message": "Universal PIN updated successfully",
			"new_pin": input.NewPin, // Optional: send it back to confirm
		})
	}
}
