# SEAS Firmware

This folder contains the device-layer work for the **Smart Emergency Alert System (SEAS)** project.

## Overview

The firmware side of SEAS is responsible for representing the behavior of the field device that monitors environmental and security conditions, reports readings to the backend, and participates in the end-to-end emergency alert workflow.

In the full system vision, the firmware layer is expected to handle:

- sensor reading and device-side monitoring
- communication with the SEAS backend
- alert-triggering input delivery to the platform
- future local device reactions such as buzzer/LED alerts
- future resilience features such as offline buffering and recovery

## Current Implementation

At the current stage of the project, the firmware layer is represented by a **lightweight Python simulator** rather than a fully deployed ESP32 firmware implementation.

This simulator acts as a virtual device and is used to validate the vertical slice between the device layer and the SEAS backend.

The simulator currently supports:

- device authentication through `/api/devices/auth`
- periodic reading submission through `/api/readings`
- intentional abnormal scenario triggering for alert testing
- clear terminal logging for authentication, request success, and failures

This approach was chosen to allow fast and reliable end-to-end testing of the backend, alert generation logic, and web/PWA workflow without being blocked by hardware availability or simulator limitations.

## Current Files

- `simulator.py`  
  Standalone Python script that simulates a virtual SEAS device.

- `config.example.json`  
  Example configuration file showing the expected simulator settings.

- `config.json`  
  Local runtime configuration file created by copying `config.example.json` and filling in real values. This file should not be committed if it contains real secrets.

## Simulator Scenarios

The simulator currently supports the following scenarios:

- `normal`  
  Sends safe gas readings that should not trigger emergency events.

- `gas_leak`  
  Sends dangerous gas readings intended to trigger a critical gas alert.

- `mixed`  
  Sends mostly normal readings, with periodic dangerous readings to simulate intermittent abnormal conditions.

## Configuration

Create a local `config.json` file inside `firmware/` based on `config.example.json`.

Example structure:

```json
{
  "base_url": "https://seas-web.vercel.app",
  "device_serial_number": "SEAS-SIM-001",
  "device_secret": "replace-with-your-device-secret",
  "interval_seconds": 5,
  "request_timeout_seconds": 15,
  "sensors": {
    "gas": {
      "sensor_id": "replace-with-gas-sensor-uuid",
      "unit": "ppm"
    }
  }
}
```

## Configuration fields

- `base_url`  
Base URL of the deployed SEAS web/backend application.

- `device_serial_number`  
    Serial number of the registered device.

- `device_secret`  
    Secret associated with the registered device, used for device authentication.

- `interval_seconds`  
    Delay between simulated readings.

- `request_timeout_seconds`  
    Timeout used for backend HTTP requests.

- `sensors.gas.sensor_id`  
    UUID of the gas sensor record that already exists in the backend for the registered device.

- `sensors.gas.unit`  
    Unit used for simulated gas readings, currently ppm.

## Important Note About Sensors

The current backend flow requires sensor records to already exist before the simulator can submit readings.

This means the current workflow is:

- register a device
- create the sensor record for that device in the backend
- copy the created `sensor_id` into `firmware/config.json`
- run the simulator and submit readings using that sensor ID

At this stage, sensor creation is handled by the backend and administrative flow, not automatically by the simulator.

## Running the Simulator

From the project root, run one of the following:

### Normal Scenario
```
python firmware/simulator.py normal
```
### Gas leak scenario
```
python firmware/simulator.py gas_leak
```
### Mixed scenario
```
python firmware/simulator.py mixed
```
The simulator runs continuously and sends readings at the configured interval until stopped manually.

To stop it, press:
```
Ctrl + C
```

## Logging

The simulator prints terminal logs that act as the virtual equivalent of a serial monitor.

These logs include:

- startup information
- device authentication status
- reading submission attempts
- backend success/failure responses
- abnormal event creation feedback

## Wokwi-Based Simulation Note

Because Wokwi provides limited direct support for some of the required sensors, fire, gas/smoke, and motion inputs can be modeled using equivalent virtual components. An analog potentiometer can be used to simulate changing gas concentration values, while pushbuttons can be used to simulate binary flame and motion events. This approach makes it possible to validate firmware behavior, backend event generation, and end-to-end alert workflows in a controlled environment without relying on physical hardware.

## Why a Python Simulator Was Used

A Python simulator was selected for the first firmware vertical slice because it offers:

- fast setup without requiring a separate embedded toolchain
- easy testing against the deployed backend
- simple repeatable scenario control
- easier debugging during backend integration
- a practical path for validating the full SEAS alert workflow early in development

This makes it well suited for the current project phase, where the priority is proving the device-to-backend pipeline before moving into a more complete hardware-oriented implementation.

## Next Steps

Planned future firmware work may include:

- support for additional simulated sensors such as flame, motion, and door
- automatic provisioning or registration flow for simulator-defined sensors
- local device alert behavior such as LED or buzzer output
- offline buffering and replay of unsent readings
- migration from the software simulator toward real ESP32-based firmware

## Summary

The current firmware folder establishes the first working device-layer vertical slice for SEAS. Using a lightweight simulator, the project can already authenticate a virtual device, submit simulated readings, and trigger backend alert logic successfully. This provides a strong foundation for future expansion into richer simulation and real embedded implementation.