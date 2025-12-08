# IoT Light Control System

A complete IoT solution for controlling lights remotely through a web interface, Google Assistant integration, and ESP8266 microcontroller.

## 📋 Overview

This project consists of three main components:

1. **Web Interface** - A responsive Node.js web application with control buttons
2. **Webhook Integration** - n8n webhook for processing commands (Google Assistant compatible)
3. **ESP8266 Hardware** - Microcontroller code for physical light control via MQTT

## 🏗️ System Architecture

This system offers **two ways** to control your lights:

### Method 1: Google Assistant
```
Google Assistant → Adafruit IO (MQTT) → ESP8266 → Relay → Lights
```

### Method 2: Web Interface
```
Web Interface → n8n Webhook → Adafruit IO (MQTT) → ESP8266 → Relay → Lights
```

## 🌐 Web Application

### Tech Stack
- **Backend**: Node.js + Express
- **Frontend**: HTML, CSS, JavaScript (Vanilla)


### How It Works
The web interface sends POST requests to the n8n webhook with JSON payloads:
- Turn On: `{"command": "turn on the lights"}`
- Turn Off: `{"command": "turn off the lights"}`


### Requirements
- ESP8266 board
- Relay module


### Configuration
Edit `ESP8622_code/src.ino` and replace:
- `WIFI_SSID` - Your WiFi network name
- `WIFI_PASSWORD` - Your WiFi password
- `AIO_USERNAME` - Your Adafruit IO username
- `AIO_KEY` - Your Adafruit IO key


## 📁 Project Structure

```
IOT_Light/
├── server.js              # Express server
├── package.json           # Node.js dependencies
├── vercel.json           # Vercel deployment config
├── public/
│   ├── index.html        # Web interface
│   ├── script.js         # Client-side logic
│   └── style.css         # Styling
└── ESP8622_code/
    ├── src.ino           # ESP8266 firmware
    └── README.md         # Hardware setup guide
```

### n8n Workflow
The webhook expects JSON with a `command` field. Set up your n8n workflow to:
1. Receive webhook POST request
2. Parse the command
3. Send appropriate signal to Adafruit IO
4. Return success response

## 🔌 Hardware Wiring

```
ESP8266 D1 Pin → Relay Signal Pin
Relay VCC → 5V
Relay GND → GND
Light Load → Relay NO/NC terminals
```

