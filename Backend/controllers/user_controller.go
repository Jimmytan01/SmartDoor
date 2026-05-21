package controllers

import (
	"context"
	"net/http"
	"smartdoor/models"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CreateUser handles adding a new RFID card/user to the database
func CreateUser(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var newUser models.User

		// 1. Parse the incoming JSON payload from the frontend
		if err := c.ShouldBindJSON(&newUser); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
			return
		}

		// Set default role if frontend doesn't provide one
		if newUser.Role == "" {
			newUser.Role = "user"
		}

		// 2. Insert into the database
		// Using the RETURNING id clause allows us to get the newly created ID back instantly
		query := `INSERT INTO users (name, rfid_tag, role, is_active) 
			VALUES ($1, $2, $3, true) 
			ON CONFLICT (rfid_tag) 
			DO UPDATE SET 
				name = EXCLUDED.name, 
				role = EXCLUDED.role, 
				is_active = true 
			RETURNING id, created_at, is_active`

		err := db.QueryRow(context.Background(), query, newUser.Name, newUser.RFIDTag, newUser.Role).
			Scan(&newUser.ID, &newUser.CreatedAt, &newUser.IsActive)

		if err != nil {
			// This catches errors like trying to register the same RFID tag twice (UNIQUE constraint)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user. Card might already exist."})
			return
		}

		// 3. Return the successfully created user back to the dashboard
		c.JSON(http.StatusCreated, newUser)
	}
}

func GetActiveUsers(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// QUERY DENGAN FILTER is_active = true
		query := `SELECT id, name, rfid_tag, role, created_at FROM users WHERE is_active = true ORDER BY id ASC`

		rows, err := db.Query(context.Background(), query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data user"})
			return
		}
		defer rows.Close()

		var users []models.User

		for rows.Next() {
			var user models.User
			// Pastikan urutan Scan sama dengan urutan SELECT
			err := rows.Scan(&user.ID, &user.Name, &user.RFIDTag, &user.Role, &user.CreatedAt)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca data"})
				return
			}
			users = append(users, user)
		}

		// Jika data kosong, kirim array kosong agar frontend tidak error
		if users == nil {
			users = []models.User{}
		}

		c.JSON(http.StatusOK, users)
	}
}

func DeleteUser(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Ambil ID user dari parameter URL (contoh: /api/users/3)
		userID := c.Param("id")

		// 2. Ubah is_active menjadi false di database
		query := `UPDATE users SET is_active = false WHERE id = $1`

		commandTag, err := db.Exec(context.Background(), query, userID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus user ke database"})
			return
		}

		// Jika ID yang dikirim tidak ada di database
		if commandTag.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
			return
		}

		// 3. Kirim pesan sukses ke frontend
		c.JSON(http.StatusOK, gin.H{"message": "User berhasil dihapus (akses dinonaktifkan)"})
	}
}
