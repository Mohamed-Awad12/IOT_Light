# IoT Light Control System

A comprehensive IoT solution for remote light control featuring a modern web interface, Google Assistant integration, real-time status monitoring, and ESP8266 microcontroller hardware control.

## 📋 Project Overview

This project implements a complete smart lighting system that enables users to control physical lights through multiple interfaces. The system provides real-time synchronization between the physical device state and the user interface.

### Key Features

- **Interactive Web Dashboard** - Modern, responsive web application with animated lamp visualization
- **Real-Time Status Monitoring** - Live synchronization with the physical device state via Adafruit IO API
- **Multiple Control Methods** - Pull cord interaction, button controls, and voice commands
- **Google Assistant Integration** - Voice control capability through n8n webhook
- **Secure Authentication** - Password-protected history access with reCAPTCHA verification
- **Rate Limiting** - Protection against brute-force attacks with configurable lockout
- **History Logging** - Complete activity history with timestamp records

## 🏗️ System Architecture

The system supports multiple control pathways:

### Method 1: Google Assistant Voice Control
```
Google Assistant → Adafruit IO (MQTT) → ESP8266 → Relay → Lights
```

### Method 2: Web Interface Control
```
Web Interface → n8n Webhook → Adafruit IO (MQTT) → ESP8266 → Relay → Lights
```

### Real-Time Status Synchronization
```
Adafruit IO API ← Polling (1s interval) ← Web Interface
```

## 🌐 Web Application

### Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express.js |
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Animation | GSAP (GreenSock Animation Platform) |
| Effects | Canvas API, Confetti.js |
| Database | Upstash Redis (Rate Limiting & Sessions) |
| Deployment | Vercel |

### User Interface Features

#### Interactive Lamp Visualization
The web interface features an animated lamp that reflects the real-time state of the physical light:

- **Visual State Indication** - Lamp glows when on, dims when off
- **Particle Effects** - Dynamic particle system when lamp is active
- **Light Rays Animation** - Animated light rays emanating from the bulb
- **Mouse Interaction** - 3D perspective tilt following cursor movement

#### Pull Cord Control
An innovative pull cord mechanism provides an intuitive control method:

- **Drag Interaction** - Pull down the cord handle to toggle light state
- **Visual Feedback** - Cord stretches during pull with elastic return animation
- **Haptic Response** - Lamp swing animation on successful toggle

#### Button Controls
Traditional button interface for direct control:

- **Turn On** - Activates the light with visual confirmation
- **Turn Off** - Deactivates the light with fade animation
- **View History** - Access to authenticated history dashboard

### Security Implementation

#### Authentication System
- Username and password authentication for history access
- Session token management with configurable expiry
- reCAPTCHA v2 integration for bot protection

#### Rate Limiting
- Maximum 5 login attempts before lockout
- 3-minute lockout duration
- Server-side and client-side attempt tracking
- IP-based rate limiting with Redis storage

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control` | POST | Send light control commands |
| `/api/status` | GET | Retrieve last command status |
| `/api/status/lamp` | GET | Get current lamp state from Adafruit IO |
| `/api/auth/login` | POST | Authenticate user for history access |
| `/api/auth/logout` | POST | Terminate user session |
| `/api/auth/status` | GET | Check authentication requirements |
| `/api/history/request` | POST | Retrieve historical data (authenticated) |

## 🔧 Hardware Component

### Requirements
- ESP8266 Development Board 
- 5V Relay Module
- Power Supply
- Connecting Wires

### Configuration
Configure the following parameters in `ESP8622_code/src.ino`:

| Parameter | Description |
|-----------|-------------|
| `WIFI_SSID` | WiFi network name |
| `WIFI_PASSWORD` | WiFi network password |
| `AIO_USERNAME` | Adafruit IO account username |
| `AIO_KEY` | Adafruit IO API key |

### Wiring Diagram

```
ESP8266 D1 Pin ──────► Relay Signal Pin
ESP8266 5V     ──────► Relay VCC
ESP8266 GND    ──────► Relay GND
AC Load        ──────► Relay NO/NC Terminals
```

## 📁 Project Structure

```
IOT_Light/
├── server.js                 # Express.js server entry point
├── package.json              # Node.js dependencies and scripts
├── vercel.json               # Vercel deployment configuration
├── public/
│   ├── index.html            # Main control interface
│   ├── history.html          # History dashboard
│   ├── script.js             # Control interface logic
│   ├── history.js            # History interface logic
│   └── style.css             # Application styling
├── src/
│   ├── config/
│   │   └── index.js          # Environment configuration
│   ├── middlewares/
│   │   ├── index.js          # Middleware exports
│   │   └── verifySession.js  # Session verification middleware
│   ├── models/
│   │   ├── index.js          # Model exports
│   │   ├── rateLimit.js      # Rate limiting logic
│   │   └── session.js        # Session management
│   └── routes/
│       ├── index.js          # Route aggregation
│       ├── auth.js           # Authentication routes
│       ├── control.js        # Light control routes
│       ├── history.js        # History data routes
│       └── status.js         # Status check routes
└── ESP8622_code/
    ├── src.ino               # ESP8266 firmware source
    └── README.md             # Hardware setup documentation
```

## ⚙️ Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `HISTORY_USERNAME` | Username for history authentication |
| `HISTORY_PASSWORD` | Password for history authentication |
| `AIO_USERNAME` | Adafruit IO username |
| `AIO_KEY` | Adafruit IO API key |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA secret key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis authentication token |


### Vercel Deployment
The project includes `vercel.json` for seamless deployment to Vercel platform.

## 📖 n8n Webhook Integration

Configure your n8n workflow to:

1. Receive POST requests at the webhook endpoint
2. Parse the JSON payload containing the `command` field
3. Forward the command to Adafruit IO MQTT broker
4. Return appropriate success/error response

### Expected Payload Format
```json
{
    "command": "turn on the lights"
}
```

```json
{
    "command": "turn off the lights"
}
```

