# SEAS Firmware

This folder contains the device-layer work for the **Smart Emergency Alert System (SEAS)** project.

## Overview

The firmware side of SEAS represents the behavior of field devices that monitor environmental and security conditions, report readings to the backend, and participate in the end-to-end emergency alert workflow.

The firmware layer handles:

- sensor reading and device-side monitoring
- communication with the SEAS backend
- alert-triggering input delivery to the platform
- physical ESP32 device integration
- virtual device simulation for repeatable testing
- local device reactions such as buzzer or LED alerts
- resilience features such as offline buffering and recovery

## Current Implementation

At the final project stage, the firmware layer includes **two device implementations**:

1. a physical **ESP32 firmware demo** used for the real hardware presentation
2. a lightweight **Python simulator** used for repeatable backend and alert-flow testing

The ESP32 firmware validates the real device-to-backend workflow, while the Python simulator remains useful for testing scenarios without depending on hardware availability.

Both implementations follow the same core workflow:

1. register or provision a device
2. authenticate the device through `/api/devices/auth`
3. synchronize sensors through `/api/devices/sensors/sync`
4. submit readings through `/api/readings`
5. allow the backend to create emergency alerts when readings match alert rules

## Physical ESP32 Firmware

The physical ESP32 firmware is located under:

```text
firmware/esp32/seas_esp32_setup/seas_esp32_setup.ino
```

The ESP32 demo supports:

- Wi-Fi connection and normal runtime mode
- stored device secret reuse after provisioning
- device authentication with the backend
- backend sensor synchronization
- mapping returned backend `sensor_id` values to local ESP32 sensors
- periodic sensor reading submission
- serial monitor logging for provisioning, authentication, sync, readings, and failures
- physical sensor testing for emergency alert generation

### ESP32 Pin Configuration

The final physical demo uses the following ESP32 pin setup:

| Component | Pin | Logic |
|---|---:|---|
| LED | GPIO 4 | Turns on during alert state |
| Buzzer module | GPIO 18 | Active-LOW, currently disabled in firmware |
| PIR motion sensor | GPIO 21 | HIGH means motion detected |
| Flame sensor | GPIO 22 | LOW means flame detected |
| Reed door sensor | GPIO 23 | LOW means door closed, using `INPUT_PULLUP` |
| Gas/smoke digital sensor | GPIO 34 | LOW means gas/smoke detected |

### Physical Sensors

The ESP32 synchronizes these physical sensors with the backend:

| Local sensor | Backend sensor type | Meaning |
|---|---|---|
| PIR motion sensor | `motion` | Detects movement |
| Flame sensor | `flame` | Detects fire/flame |
| Reed switch | `door` | Detects open/closed door state |
| Gas/smoke sensor | `gas_smoke` | Detects gas or smoke threshold state |

The physical demo sends boolean-style readings:

| Value | Meaning |
|---:|---|
| `0` | normal, inactive, or safe state |
| `1` | detected, abnormal, or alert-relevant state |

For display purposes, the web app converts these raw values into readable labels such as **No motion**, **Door closed**, **No flame**, **Normal**, **Motion detected**, **Door open**, **Flame detected**, and **Gas/smoke detected**.

### ESP32 Runtime Flow

The ESP32 firmware follows this runtime sequence:

1. connect to Wi-Fi
2. check if a device secret already exists
3. provision only when needed
4. authenticate the device
5. sync physical sensors with the backend
6. store returned backend `sensor_id` values
7. submit readings for motion, flame, door, and gas/smoke sensors
8. repeat reading submission at the configured interval

The ESP32 does not submit readings until authentication succeeds and all required backend sensor IDs are available.

### Alert Behavior

Alert creation is handled by the backend after readings are submitted.

The final project logic separates safety alerts from security alerts:

| Sensor event | Security mode | Result |
|---|---|---|
| Flame detected | armed or disarmed | Critical fire alert |
| Gas/smoke detected | armed or disarmed | Critical gas/smoke alert |
| Motion detected | disarmed | Reading only, no intrusion alert |
| Door opened | disarmed | Reading only, no intrusion alert |
| Motion detected | armed | High intrusion alert |
| Door opened | armed | High intrusion alert |

The web app provides an **Arm Site / Disarm Site** action on the site details page. This allows the user to control whether motion and door activity should be treated as intrusion events.

### Online and Offline Behavior

When the ESP32 submits readings successfully, the backend updates the device status and last-seen time. If the device stops sending readings, the backend/device status fallback can mark it offline after the configured timeout. When the ESP32 reconnects and sends readings again, the device returns online.

## Python Simulator

The Python simulator acts as a virtual SEAS device and is used to validate the vertical slice between the device layer and the SEAS backend.

The simulator currently supports:

- device provisioning and secret storage
- device authentication through `/api/devices/auth`
- sensor synchronization through `/api/devices/sensors/sync`
- reading submission through `/api/readings`
- multiple run modes for quick testing or continuous simulation
- intentional abnormal scenario triggering for alert and notification testing
- clear terminal logging for authentication, synchronization, reading submission, and failures

This approach allows fast and reliable end-to-end testing of the backend, alert generation logic, and web/PWA workflow without being blocked by hardware availability.

## Current Files

- `esp32/seas_esp32_setup/seas_esp32_setup.ino`  
  Physical ESP32 firmware used for the final hardware demo.

- `simulator.py`  
  Standalone Python script that simulates a virtual SEAS device.

- `config.example.json`  
  Example configuration file showing the expected simulator settings.

- `config.json`  
  Local runtime configuration created by copying `config.example.json` and filling in real values. This file should not be committed if it contains real secrets or environment-specific values.

- `device_secret.txt`  
  Created automatically after provisioning. Stores the generated device secret for future simulator runs.

## Supported Run Modes

The simulator supports the following run modes:

- `single`  
  Sends exactly one cycle of readings, then exits.

- `burst`  
  Sends a fixed number of reading cycles, then exits.

- `continuous`  
  Sends readings continuously at the configured interval until stopped manually.

## Supported Scenarios

The simulator supports the following scenarios:

- `normal`  
  Sends safe readings that should not trigger emergency events.

- `gas_leak`  
  Sends dangerous gas readings intended to trigger gas alerts.

- `fire`  
  Simulates flame or smoke-related abnormal readings.

- `intrusion`  
  Simulates motion or door-related abnormal readings.

- `mixed`  
  Sends mostly normal readings, with periodic abnormal readings to simulate intermittent issues.

## Configuration

Create a local `config.json` file inside `firmware/` based on `config.example.json`.

Example structure:

```json
{
  "base_url": "https://seas-web.netlify.app",
  "device_serial_number": "SEAS-SIM-001",
  "interval_seconds": 5,
  "request_timeout_seconds": 15,
  "sensors": [
    {
      "external_key": "gas-1",
      "sensor_type": "gas",
      "location_label": "Gas input",
      "unit": "ppm"
    },
    {
      "external_key": "flame-1",
      "sensor_type": "flame",
      "location_label": "Flame detector",
      "unit": "bool"
    },
    {
      "external_key": "motion-1",
      "sensor_type": "motion",
      "location_label": "Hallway motion",
      "unit": "bool"
    }
  ]
}
```

## Configuration Fields

- `base_url`  
  Base URL of the deployed SEAS web/backend application.

- `device_serial_number`  
  Serial number used by the simulator device.

- `interval_seconds`  
  Delay between reading cycles.

- `request_timeout_seconds`  
  Timeout used for backend HTTP requests.

- `sensors`  
  List of sensors the simulator should expose and sync with the backend.

Each sensor entry supports:

- `external_key`  
  Stable device-side identifier used to match the sensor during sync.

- `sensor_type`  
  Sensor type, such as `gas`, `flame`, `smoke`, `motion`, or `door`.

- `location_label`  
  Human-readable location or label for the sensor.

- `unit`  
  Unit used for the generated reading value.

## Sensor Synchronization

The simulator and ESP32 firmware do **not** require manually copying backend `sensor_id` values into configuration or firmware code.

Instead, the workflow is:

1. start the device implementation
2. provision the device if needed
3. authenticate the device
4. sync the configured sensors with the backend
5. submit readings using the returned sensor IDs

This makes the simulator and physical ESP32 firmware more practical for repeated PWA, backend, and integration testing.

## Running the Simulator

From the project root, run one of the following commands.

### 1. Send one reading cycle for one sensor

```bash
python firmware/simulator.py normal --mode single --sensor gas
```

### 2. Send five reading cycles for one sensor

```bash
python firmware/simulator.py normal --mode burst --count 5 --sensor gas
```

### 3. Send five cycles for all configured sensors

```bash
python firmware/simulator.py mixed --mode burst --count 5 --all-sensors
```

### 4. Run continuously for all configured sensors

```bash
python firmware/simulator.py mixed --mode continuous --all-sensors
```

## How Counting Works

In `burst` mode, `--count` represents the number of **cycles**, not the total number of API submissions.

For example:

- `--count 5 --sensor gas` sends **5 readings**
- `--count 5 --all-sensors` with 3 configured sensors sends **15 readings**

## Stopping the Simulator

To stop continuous mode manually, press:

```bash
Ctrl + C
```

## Logging

The simulator prints terminal logs that act as the virtual equivalent of a serial monitor.

These logs include:

- startup information
- provisioning status
- device authentication status
- sensor synchronization status
- reading submission attempts
- backend success or failure responses
- abnormal event creation feedback

The physical ESP32 firmware provides equivalent runtime visibility through the Arduino Serial Monitor.

## Why a Python Simulator Was Used

A Python simulator was selected for the first firmware vertical slice because it offers:

- fast setup without requiring a separate embedded toolchain
- easy testing against the deployed backend
- simple repeatable scenario control
- easier debugging during backend integration
- a practical path for validating the full SEAS alert workflow early in development

This made it well suited for the early project phase, where the priority was proving the device-to-backend pipeline before moving into the physical ESP32 implementation.

The simulator remains useful even after the physical ESP32 demo because it provides repeatable software-only testing for normal, fire, gas, and intrusion scenarios.

## Next Steps

Planned future firmware work may include:

- richer simulated sensor combinations and scenario presets
- local device alert behavior such as buzzer output
- offline buffering and replay of unsent readings
- storing Wi-Fi credentials through a cleaner setup flow
- closer parity between simulator behavior and physical device logic
- optional analog gas/smoke value calibration instead of boolean threshold readings

## Summary

The firmware folder now establishes both a working physical ESP32 demo and a repeatable simulator-based device layer for SEAS. The project can provision or reuse a device secret, authenticate with the backend, synchronize sensors, submit readings, update device online status, and trigger backend alert logic successfully. The physical ESP32 implementation demonstrates the real hardware path, while the simulator remains useful for controlled testing and future development.
