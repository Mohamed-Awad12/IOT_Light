#include <ESP8266WiFi.h>
#include "Adafruit_MQTT.h"
#include "Adafruit_MQTT_Client.h"

#define Relay1 D1

/************ WiFi Settings ************/
#define WLAN_SSID       "WIFI_SSID"
#define WLAN_PASS       "WIFI_PASSWORD"

/************ Adafruit IO Settings ************/
#define AIO_SERVER      "io.adafruit.com"
#define AIO_SERVERPORT  1883
#define AIO_USERNAME    "AIO_USERNAME"
#define AIO_KEY         "AIO_KEY"

/************ Global State ************/
WiFiClient client;
Adafruit_MQTT_Client mqtt(&client, AIO_SERVER, AIO_SERVERPORT, AIO_USERNAME, AIO_KEY);

/************ Feeds ************/
Adafruit_MQTT_Subscribe Light1 = Adafruit_MQTT_Subscribe(&mqtt, AIO_USERNAME "/feeds/light");

void MQTT_connect();

void setup() {
  Serial.begin(115200);
  pinMode(Relay1, OUTPUT);

  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WLAN_SSID);

  WiFi.begin(WLAN_SSID, WLAN_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  mqtt.subscribe(&Light1);
}

void loop() {

  MQTT_connect();

  Adafruit_MQTT_Subscribe *subscription;
  while ((subscription = mqtt.readSubscription(5000))) {

    if (subscription == &Light1) {
      String message = (char *)Light1.lastread;
      Serial.print("Feed value received: ");
      Serial.println(message);

      int state = message.toInt();
      digitalWrite(Relay1, state);   
    }
  }
}

void MQTT_connect() {
  int8_t ret;

  if (mqtt.connected()) return;

  Serial.print("Connecting to MQTT... ");

  uint8_t retries = 3;
  while ((ret = mqtt.connect()) != 0) {
    Serial.println(mqtt.connectErrorString(ret));
    Serial.println("Retrying in 5 seconds...");
    mqtt.disconnect();
    delay(5000);
    retries--;
    if (retries == 0) {
      while (1); // Reset by watchdog
    }
  }

  Serial.println("MQTT Connected!");
}