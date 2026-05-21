package main

import (
	"context"
	"fmt"
	"log"
	"smartdoor/controllers"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Global database connection variable
var db *pgxpool.Pool

func main() {
	// Connect to PostgreSQL
	dsn := "postgres://postgres:postgres@localhost:5432/MyDoor"

	var err error
	db, err = pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer db.Close()

	fmt.Println("Successfully connected to the PostgreSQL database!")

	// MQTT Connection Setup
	opts := mqtt.NewClientOptions()
	opts.AddBroker("tcp://localhost:1883") // Default local Mosquitto port
	opts.SetClientID("go_backend")

	opts.OnConnect = func(c mqtt.Client) {
		fmt.Println("Successfully connected to Mosquitto MQTT Broker!")
		// Subscribe to the topic as soon as we connect
		if token := c.Subscribe("smartdoor/auth/request", 0, controllers.HandleESPRequest(db)); token.Wait() && token.Error() != nil {
			log.Fatal(token.Error())
		}
		fmt.Println("📡 Listening on topic: smartdoor/auth/request")
	}

	mqttClient := mqtt.NewClient(opts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to connect to MQTT broker: %v\n", token.Error())
	}

	// Initialize the Gin web framework
	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true // Mengizinkan semua frontend (lokal) mengakses backend ini
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	router.Use(cors.New(config))

	router.GET("/api/logs", controllers.GetLogs(db))
	router.GET("/api/users", controllers.GetActiveUsers(db))
	router.POST("/api/users", controllers.CreateUser(db))
	router.PUT("/api/settings/pin", controllers.UpdateUniversalPin(db))
	router.GET("/api/logs/latest-unknown", controllers.GetLatestUnknownScan(db))
	router.DELETE("/api/users/:id", controllers.DeleteUser(db))

	fmt.Println("🚀 Server running on http://localhost:8080")
	router.Run(":8080")
}
