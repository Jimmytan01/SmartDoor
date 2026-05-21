#include <WiFi.h>
#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <LiquidCrystal_I2C.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// 1. DEFINISI PIN & KOMPONEN
// ==========================================

LiquidCrystal_I2C lcd(0x27, 16, 2); 

char ssid[] = "kentangrebus";
char pass[] = "VIVOJIMMY";

const char* mqtt_server = "192.168.77.6";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

const int SS_PIN     = 5;
const int RST_PIN    = 22;
const int RELAY_PIN  = 4;
const int BUZZER_PIN = 15;

MFRC522 rfid(SS_PIN, RST_PIN);

const byte ROW_NUM    = 4; 
const byte COLUMN_NUM = 4; 
byte pin_rows[ROW_NUM]      = {13, 14, 26, 25}; 
byte pin_column[COLUMN_NUM] = {33, 32, 27, 21}; 

char keys[ROW_NUM][COLUMN_NUM] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

Keypad keypad = Keypad(makeKeymap(keys), pin_rows, pin_column, ROW_NUM, COLUMN_NUM);

// ==========================================
// 2. DATABASE LOKAL & STATE MANAGEMENT
// ==========================================

String inputPIN = ""; 

// Variabel Non-Blocking untuk reset layar LCD saja
unsigned long waktuPesanLCD  = 0;
bool tampilkanPesan = false;

// ==========================================
// 3. FUNGSI LAYAR LCD
// ==========================================

void tampilanStandby() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("   SMART DOOR   ");
  lcd.setCursor(0, 1);
  lcd.print("Tap KTM/Isi PIN ");
}

void notifikasiLCD(String baris1, String baris2) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(baris1);
  lcd.setCursor(0, 1); lcd.print(baris2);
  
  tampilkanPesan = true;
  waktuPesanLCD = millis();
}

// ==========================================
// 4. FUNGSI AUDIO & RELAY (TANPA DELAY LAMA)
// ==========================================

void nadaSukses() {
  digitalWrite(BUZZER_PIN, HIGH); delay(100); digitalWrite(BUZZER_PIN, LOW); delay(100);
  digitalWrite(BUZZER_PIN, HIGH); delay(100); digitalWrite(BUZZER_PIN, LOW);
}

void nadaGagal() {
  digitalWrite(BUZZER_PIN, HIGH); delay(1000); digitalWrite(BUZZER_PIN, LOW);
}

void bukaPintu() {
  Serial.println("-> AKSES DITERIMA");
  notifikasiLCD(" AKSES DITERIMA ", " Silakan Masuk! ");
  nadaSukses(); 
  
  // 1. Beri "tendangan" listrik singkat agar tuas magnet tertarik & kapasitor terisi
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); 
  delay(3000); // 0.2 Detik (Sangat tidak terasa oleh sistem)
  
  // 2. Langsung putus arusnya! 
  // Kita biarkan sisa tegangan di kapasitor relay menahan pintu terbuka secara mandiri
  pinMode(RELAY_PIN, INPUT);    
  Serial.println("-> Arus diputus. Mengandalkan delay hardware relay ~8 detik.\n");
}

// ==========================================
// 5. FUNGSI MQTT & JARINGAN
// ==========================================

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, pass);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

// Fungsi ini dipanggil otomatis ketika menerima pesan dari Backend
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Pesan masuk dari topik: ");
  Serial.println(topic);

  // Parsing JSON dari backend
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return;
  }

  String status = doc["status"];
  String action = doc["action"];

  if (status == "authorized" && action == "unlock") {
    bukaPintu();
  } else {
    Serial.println("-> AKSES DITOLAK OLEH SERVER!\n");
    notifikasiLCD(" AKSES DITOLAK! ", "  ID/PIN Salah  ");
    nadaGagal();
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("ESP32_SmartDoor")) {
      Serial.println("connected");
      // Subscribe ke topik respons setelah berhasil connect
      client.subscribe("smartdoor/auth/response");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void kirimRequestKeBackend(String tipe, String nilai) {
  notifikasiLCD(" MEMERIKSA... ", " Tunggu Server. ");
  
  StaticJsonDocument<200> doc;
  doc["type"] = tipe;
  doc["value"] = nilai;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  Serial.print("Mengirim request: ");
  Serial.println(jsonBuffer);

  // Publish ke topik request
  client.publish("smartdoor/auth/request", jsonBuffer);
}

// ==========================================
// 6. FUNGSI SENSOR
// ==========================================

void bacaRFID() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uidString += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uidString += String(rfid.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();

  Serial.println("UID KTM: " + uidString);

  kirimRequestKeBackend("rfid", uidString);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void bacaKeypad() {
  char tombol = keypad.getKey();

  if (tombol) {
    digitalWrite(BUZZER_PIN, HIGH); delay(50); digitalWrite(BUZZER_PIN, LOW);

    if (tombol == '*') {
      inputPIN = "";
      tampilanStandby();
    } 
    else if (tombol == '#') {
      if (inputPIN.length() > 0) {
        Serial.println("PIN Dimasukkan: " + inputPIN);
        // Kirim data PIN ke backend Go
        kirimRequestKeBackend("pin", inputPIN);
      }
      inputPIN = ""; 
    } 
    else {
      if (inputPIN.length() < 11) {
        inputPIN += tombol;
        lcd.setCursor(0, 1);
        lcd.print("PIN:            "); 
        lcd.setCursor(5, 1);
        for(int i = 0; i < inputPIN.length(); i++) { lcd.print("*"); }
      }
    }
  }
}

// ==========================================
// 7. SETUP & LOOP
// ==========================================

void setup() {
  Serial.begin(115200);
  Wire.begin(16,17);
  
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("System Starting.");
  
  SPI.begin();
  rfid.PCD_Init();
  
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW); 
  pinMode(RELAY_PIN, INPUT);

  // Setup WiFi & MQTT
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  tampilanStandby();
}

void loop() {
  // Pastikan koneksi MQTT tetap hidup
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Mengecek apakah sudah waktunya mengembalikan tulisan LCD ke Standby (setelah 2 detik)
  if (tampilkanPesan && (millis() - waktuPesanLCD >= 2000)) {
    tampilkanPesan = false;
    tampilanStandby();
  }

  bacaRFID();
  bacaKeypad();
}