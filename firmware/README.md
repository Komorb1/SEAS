# SEAS Firmware

This folder contains the device-layer work for the **Smart Emergency Alert System (SEAS)** project.

## Overview

The firmware side of SEAS represents the behavior of field devices that monitor environmental and security conditions, report readings to the backend, and participate in the end-to-end emergency alert workflow.

In the full system vision, the firmware layer is expected to handle:

- sensor reading and device-side monitoring
- communication with the SEAS backend
- alert-triggering input delivery to the platform
- future local device reactions such as buzzer or LED alerts
- future resilience features such as offline buffering and recovery

## Current Implementation

At the current stage of the project, the firmware layer is represented by a **lightweight Python simulator** rather than a fully deployed ESP32 firmware implementation.

This simulator acts as a virtual SEAS device and is used to validate the vertical slice between the device layer and the SEAS backend.

The simulator currently supports:

- device provisioning and secret storage
- device authentication through `/api/devices/auth`
- sensor synchronization through `/api/devices/sensors/sync`
- reading submission through `/api/readings`
- multiple run modes for quick testing or continuous simulation
- intentional abnormal scenario triggering for alert and notification testing
- clear terminal logging for authentication, synchronization, reading submission, and failures

This approach allows fast and reliable end-to-end testing of the backend, alert generation logic, and web/PWA workflow without being blocked by hardware availability or simulator limitations.

## Current Files

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
  "base_url": "https://seas-web.vercel.app",
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

The simulator does **not** require manually copying backend `sensor_id` values into `config.json`.

Instead, the workflow is:

1. start the simulator
2. provision the device if needed
3. authenticate the device
4. sync the configured sensors with the backend
5. submit readings using the returned sensor IDs

This makes the simulator more practical for repeated PWA and integration testing.

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

## Why a Python Simulator Was Used

A Python simulator was selected for the first firmware vertical slice because it offers:

- fast setup without requiring a separate embedded toolchain
- easy testing against the deployed backend
- simple repeatable scenario control
- easier debugging during backend integration
- a practical path for validating the full SEAS alert workflow early in development

This makes it well suited for the current project phase, where the priority is proving the device-to-backend pipeline before moving into a more complete hardware-oriented implementation.

## Wokwi-Based Simulation Note

Because Wokwi provides limited direct support for some of the required sensors, fire, gas or smoke, and motion inputs can be represented using equivalent virtual components. An analog potentiometer can be used to simulate changing gas concentration values, while pushbuttons can be used to simulate binary flame and motion events. This makes it possible to validate device logic, backend event generation, and end-to-end alert workflows in a controlled environment without relying on physical hardware.

## Next Steps

Planned future firmware work may include:

- richer simulated sensor combinations and scenario presets
- local device alert behavior such as LED or buzzer output
- offline buffering and replay of unsent readings
- migration from the software simulator toward real ESP32-based firmware
- closer parity between simulator behavior and physical device logic

## Summary

The current firmware folder establishes a working device-layer vertical slice for SEAS. Using a lightweight simulator, the project can provision a virtual device, authenticate it, synchronize sensors, submit simulated readings, and trigger backend alert logic successfully. This provides a strong foundation for future expansion into richer simulation and real embedded implementation.
