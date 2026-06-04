#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =====================
// SEAS hardware pins
// =====================
#define LED_PIN 4
#define BUZZER_PIN 18

#define PIR_PIN 21
#define FLAME_PIN 22
#define REED_PIN 23
#define GAS_PIN 34

// BOOT button on most ESP32 dev boards
#define SETUP_BUTTON_PIN 0

// Buzzer module is active-LOW:
// LOW = ON, HIGH = OFF
const bool BUZZER_ENABLED = false;

// =====================
// Device provisioning
// =====================
const char* DEVICE_SERIAL = "SEAS-ESP32-0001";

// IMPORTANT:
// For deployed backend:
// const char* BACKEND_BASE_URL = "https://your-domain.com";
//
// For local backend, use your laptop LAN IP, not localhost:
// const char* BACKEND_BASE_URL = "http://192.168.1.50:3000";

const char* BACKEND_BASE_URL = "http://10.157.121.162:3000";

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
String deviceSecret;

bool setupPortalActive = false;
bool hasProvisionedThisBoot = false;

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

// =====================
// Wi-Fi credential storage
// =====================
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

  savedSsid = ssid;
  savedPassword = password;

  logLine("Wi-Fi credentials saved.");
}

void clearCredentials() {
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();

  savedSsid = "";
  savedPassword = "";

  logLine("Wi-Fi credentials cleared.");
}

// =====================
// Device secret storage
// =====================
void loadDeviceSecret() {
  prefs.begin("device", true);
  deviceSecret = prefs.getString("secret", "");
  prefs.end();

  if (deviceSecret.length()) {
    logLine("Device secret found. Provisioning skipped.");
  } else {
    logLine("No device secret found. Provisioning required.");
  }
}

void saveDeviceSecret(const String& secret) {
  prefs.begin("device", false);
  prefs.putString("secret", secret);
  prefs.end();

  deviceSecret = secret;

  logLine("Device secret saved.");
}

void clearDeviceSecret() {
  prefs.begin("device", false);
  prefs.clear();
  prefs.end();

  deviceSecret = "";

  logLine("Device secret cleared.");
}

// =====================
// Captive portal HTML
// =====================
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
    .small { color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>SEAS Wi-Fi Setup</h2>
    <p>Enter Wi-Fi credentials for this ESP32 device.</p>
    <p class="small">Device serial: SEAS-ESP32-0001</p>
)rawliteral" +
  (message.length() ? "<p class='msg'>" + message + "</p>" : "") +
R"rawliteral(
    <form action="/save" method="POST">
      <input name="ssid" placeholder="Wi-Fi SSID" required>
      <input name="password" placeholder="Wi-Fi Password" type="password">
      <button type="submit">Save and Restart</button>
    </form>

    <form action="/reset-wifi" method="POST">
      <button class="danger" type="submit">Clear Saved Wi-Fi</button>
    </form>

    <form action="/reset-device" method="POST">
      <button class="danger" type="submit">Clear Device Secret</button>
    </form>
  </div>
</body>
</html>
)rawliteral";
}

// =====================
// Wi-Fi connection
// =====================
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

// =====================
// Backend provisioning
// =====================
bool provisionDevice() {
  if (hasProvisionedThisBoot) {
    return deviceSecret.length() > 0;
  }

  hasProvisionedThisBoot = true;

  if (WiFi.status() != WL_CONNECTED) {
    logLine("Provisioning skipped. Wi-Fi not connected.");
    return false;
  }

  loadDeviceSecret();

  if (deviceSecret.length()) {
    return true;
  }

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/devices/provision";

  logLine("Provisioning device...");
  logLine("Serial: " + String(DEVICE_SERIAL));
  logLine("Endpoint: " + url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> requestBody;
  requestBody["serial_number"] = DEVICE_SERIAL;

  String payload;
  serializeJson(requestBody, payload);

  int httpCode = http.POST(payload);

  if (httpCode <= 0) {
    logLine("Provision request failed: " + http.errorToString(httpCode));
    http.end();
    return false;
  }

  String response = http.getString();

  logLine("Provision response code: " + String(httpCode));

  StaticJsonDocument<768> responseBody;
  DeserializationError error = deserializeJson(responseBody, response);

  if (error) {
    logLine("Provision response JSON parse failed.");
    http.end();
    return false;
  }

  if (httpCode >= 200 && httpCode < 300) {
    const char* secret =
      responseBody["device_secret"] |
      responseBody["deviceSecret"] |
      responseBody["secret"] |
      "";

    if (!strlen(secret)) {
      logLine("Provision response missing device secret.");
      http.end();
      return false;
    }

    saveDeviceSecret(String(secret));
    http.end();

    logLine("Provisioning successful.");
    return true;
  }

  const char* message =
    responseBody["error"] |
    responseBody["message"] |
    "Unknown provisioning error";

  logLine("Provisioning failed: " + String(message));

  http.end();
  return false;
}

// =====================
// Setup portal
// =====================
void startSetupPortal() {
  setupPortalActive = true;

  logLine("Starting setup portal...");

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));

  bool apStarted = WiFi.softAP(AP_SSID, AP_PASSWORD);

  if (apStarted) {
    logLine("Setup AP started successfully.");
    logLine("AP IP address: " + WiFi.softAPIP().toString());
  } else {
    logLine("Setup AP failed to start.");
  }

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

    server.send(200, "text/html", htmlPage("Wi-Fi saved. Device will restart now."));

    delay(1500);
    ESP.restart();
  });

  server.on("/reset-wifi", HTTP_POST, []() {
    clearCredentials();

    server.send(200, "text/html", htmlPage("Saved Wi-Fi cleared. Restarting."));

    delay(1500);
    ESP.restart();
  });

  server.on("/reset-device", HTTP_POST, []() {
    clearDeviceSecret();

    server.send(200, "text/html", htmlPage("Device secret cleared. Restarting."));

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
// Sensor state tracking
// =====================
bool hasLastState = false;

bool lastMotionDetected = false;
bool lastFlameDetected = false;
bool lastDoorClosed = false;
bool lastGasDetected = false;
bool lastAlert = false;
bool lastWifiConnected = false;

// =====================
// Sensor logic
// =====================
void readLocalSensors() {
  bool motionDetected = digitalRead(PIR_PIN) == HIGH;
  bool flameDetected = digitalRead(FLAME_PIN) == LOW;
  bool doorClosed = digitalRead(REED_PIN) == LOW;
  bool gasDetected = digitalRead(GAS_PIN) == LOW;
  bool alert = motionDetected || flameDetected || !doorClosed || gasDetected;
  bool wifiConnected = WiFi.status() == WL_CONNECTED;

  digitalWrite(LED_PIN, alert ? HIGH : LOW);

  if (BUZZER_ENABLED) {
    digitalWrite(BUZZER_PIN, alert ? LOW : HIGH);
  } else {
    digitalWrite(BUZZER_PIN, HIGH); // keep OFF
  }

  bool changed =
    !hasLastState ||
    motionDetected != lastMotionDetected ||
    flameDetected != lastFlameDetected ||
    doorClosed != lastDoorClosed ||
    gasDetected != lastGasDetected ||
    alert != lastAlert ||
    wifiConnected != lastWifiConnected;

  if (!changed) {
    return;
  }

  lastMotionDetected = motionDetected;
  lastFlameDetected = flameDetected;
  lastDoorClosed = doorClosed;
  lastGasDetected = gasDetected;
  lastAlert = alert;
  lastWifiConnected = wifiConnected;
  hasLastState = true;

  Serial.println("------ SEAS STATUS CHANGED ------");

  Serial.print("Wi-Fi: ");
  Serial.println(wifiConnected ? "CONNECTED" : "NOT CONNECTED");

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

  provisionDevice();
}

void loop() {
  if (setupPortalActive) {
    dnsServer.processNextRequest();
    server.handleClient();

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