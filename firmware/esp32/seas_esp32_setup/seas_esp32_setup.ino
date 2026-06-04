#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

// =====================
// SEAS hardware pins
// =====================
#define LED_PIN 4
#define BUZZER_PIN 18

#define PIR_PIN 21
#define FLAME_PIN 22
#define REED_PIN 23
#define GAS_PIN 34

// BOOT button on most ESP32 boards
#define SETUP_BUTTON_PIN 0

// Buzzer module is active-LOW:
// LOW = ON, HIGH = OFF
const bool BUZZER_ENABLED = false;

// =====================
// Wi-Fi setup portal
// =====================
const char* AP_SSID = "SEAS-SETUP";
const char* AP_PASSWORD = "12345678";

const byte DNS_PORT = 53;
IPAddress apIP(192, 168, 4, 1);

WebServer server(80);
DNSServer dnsServer;
Preferences prefs;

String savedSsid;
String savedPassword;
bool setupPortalActive = false;

// =====================
// Helpers
// =====================
void logLine(const String& message) {
  Serial.println("[SEAS] " + message);
}

void initHardware() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  pinMode(PIR_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(GAS_PIN, INPUT);

  pinMode(SETUP_BUTTON_PIN, INPUT_PULLUP);

  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, HIGH); // OFF
}

String htmlPage(const String& message = "") {
  return R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SEAS Wi-Fi Setup</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f3f4f6; }
    .card { max-width: 420px; margin: auto; background: white; padding: 20px; border-radius: 12px; }
    input, button { width: 100%; padding: 12px; margin-top: 10px; box-sizing: border-box; }
    button { background: #111827; color: white; border: 0; border-radius: 8px; cursor: pointer; }
    .danger { background: #991b1b; }
    .msg { color: #166534; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>SEAS Wi-Fi Setup</h2>
    <p>Enter Wi-Fi credentials for this ESP32 device.</p>
)rawliteral" +
  (message.length() ? "<p class='msg'>" + message + "</p>" : "") +
R"rawliteral(
    <form action="/save" method="POST">
      <input name="ssid" placeholder="Wi-Fi SSID" required>
      <input name="password" placeholder="Wi-Fi Password" type="password">
      <button type="submit">Save and Restart</button>
    </form>

    <form action="/reset" method="POST">
      <button class="danger" type="submit">Clear Saved Wi-Fi</button>
    </form>
  </div>
</body>
</html>
)rawliteral";
}

void loadCredentials() {
  prefs.begin("wifi", true);
  savedSsid = prefs.getString("ssid", "");
  savedPassword = prefs.getString("password", "");
  prefs.end();

  if (savedSsid.length()) {
    logLine("Saved Wi-Fi found: " + savedSsid);
  } else {
    logLine("No saved Wi-Fi credentials.");
  }
}

void saveCredentials(const String& ssid, const String& password) {
  prefs.begin("wifi", false);
  prefs.putString("ssid", ssid);
  prefs.putString("password", password);
  prefs.end();

  logLine("Wi-Fi credentials saved.");
}

void clearCredentials() {
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();

  logLine("Wi-Fi credentials cleared.");
}

bool connectToWifi() {
  if (!savedSsid.length()) {
    return false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(savedSsid.c_str(), savedPassword.c_str());

  logLine("Connecting to Wi-Fi...");

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    logLine("Connected.");
    logLine("IP address: " + WiFi.localIP().toString());
    return true;
  }

  logLine("Wi-Fi connection failed.");
  return false;
}

void startSetupPortal() {
  setupPortalActive = true;

  logLine("Starting setup portal...");

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  dnsServer.start(DNS_PORT, "*", apIP);

  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", htmlPage());
  });

  server.on("/save", HTTP_POST, []() {
    String ssid = server.arg("ssid");
    String password = server.arg("password");

    if (!ssid.length()) {
      server.send(400, "text/html", htmlPage("SSID is required."));
      return;
    }

    saveCredentials(ssid, password);
    server.send(200, "text/html", htmlPage("Saved. Device will restart now."));

    delay(1500);
    ESP.restart();
  });

  server.on("/reset", HTTP_POST, []() {
    clearCredentials();
    server.send(200, "text/html", htmlPage("Saved Wi-Fi cleared. Restarting."));

    delay(1500);
    ESP.restart();
  });

  server.onNotFound([]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });

  server.begin();

  logLine("Setup AP SSID: " + String(AP_SSID));
  logLine("Setup AP password: " + String(AP_PASSWORD));
  logLine("Open: http://192.168.4.1");
}

// =====================
// Sensor logic
// =====================
void readLocalSensors() {
  bool motionDetected = digitalRead(PIR_PIN) == HIGH;
  bool flameDetected = digitalRead(FLAME_PIN) == LOW;
  bool doorClosed = digitalRead(REED_PIN) == LOW;
  bool gasDetected = digitalRead(GAS_PIN) == LOW;

  bool alert = motionDetected || flameDetected || !doorClosed || gasDetected;

  digitalWrite(LED_PIN, alert ? HIGH : LOW);

  if (BUZZER_ENABLED) {
    digitalWrite(BUZZER_PIN, alert ? LOW : HIGH);
  } else {
    digitalWrite(BUZZER_PIN, HIGH); // keep OFF
  }

  Serial.println("------ SEAS STATUS ------");

  Serial.print("Wi-Fi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "NOT CONNECTED");

  Serial.print("Door: ");
  Serial.println(doorClosed ? "CLOSED" : "OPEN");

  Serial.print("Motion: ");
  Serial.println(motionDetected ? "DETECTED" : "NORMAL");

  Serial.print("Flame: ");
  Serial.println(flameDetected ? "DETECTED" : "NORMAL");

  Serial.print("Gas/Smoke: ");
  Serial.println(gasDetected ? "DETECTED" : "NORMAL");

  Serial.print("Alert: ");
  Serial.println(alert ? "YES" : "NO");
}

// =====================
// Main
// =====================
void setup() {
  Serial.begin(115200);
  delay(1500);

  initHardware();

  logLine("Booting SEAS ESP32 firmware...");

  bool forceSetup = digitalRead(SETUP_BUTTON_PIN) == LOW;

  if (forceSetup) {
    logLine("BOOT button held. Forcing setup portal.");
    startSetupPortal();
    return;
  }

  loadCredentials();

  if (!connectToWifi()) {
    startSetupPortal();
    return;
  }

  logLine("Normal mode started.");
}

void loop() {
  if (setupPortalActive) {
    dnsServer.processNextRequest();
    server.handleClient();

    // Keep local safety behavior running even during setup mode
    static unsigned long lastSetupSensorRead = 0;
    if (millis() - lastSetupSensorRead >= 1000) {
      lastSetupSensorRead = millis();
      readLocalSensors();
    }

    return;
  }

  static unsigned long lastSensorRead = 0;

  if (millis() - lastSensorRead >= 1000) {
    lastSensorRead = millis();
    readLocalSensors();
  }
}