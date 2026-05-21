# Smart Door IoT - Backend System

## 🛠 Tech Stack
* **Language:** Go (Golang)
* **Web Framework:** Gin
* **Database:** PostgreSQL
* **Hardware Messaging:** MQTT
* **Broker:** Eclipse Mosquitto

## Local Setup

1. **Install Dependencies:**
   Open your terminal and navigate to your project folder:
   ```cmd
   go mod tidy
   ```

3. **Run the Server:**
    ```cmd
   go run main.go
   ```
   The server will start on http://localhost:8080.

## MQTT Contracts

1. Hardware Request (ESP32 -> Backend)
    - Topic: smartdoor/auth/request
    - Payload (JSON):
        ```json
        { "type": "rfid", "value": "A1B2C3D4" }
        { "type": "pin", "value": "1234" }

2. Backend Decision (Backend -> ESP32)
   - Topic: smartdoor/auth/response
   - Payload (JSON):
      ```json
        { "status": "authorized", "action": "unlock" }
        { "status": "denied", "action": "none" }

## REST API Contracts

1. Get Access Logs
   - Endpoint: GET /api/logs
     - Response (200 OK):
         ```json
         [
           {
           "id": 1,
           "user_id": 1,
           "scanned_rfid": "A1B2C3D4",
           "entered_pin": null,
           "status": "RFID_GRANTED",
           "timestamp": "2026-04-27T14:30:00Z"
           }
        ]

2. Register New User
   - Endpoint: POST /api/users
   - Body:
      ```json
      {
      "name": "New Resident",
      "rfid_tag": "F9E8D7C6",
      "role": "user"
      }
     
3. Update Universal PIN
   - Endpoint: PUT /api/settings/pin
   - Body:
      ```json
      { "new_pin": "5678" }