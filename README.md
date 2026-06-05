# Smart Emergency Alert System using ESP32 (SEAS)

SEAS is a software engineering project for real-time emergency monitoring. It combines physical ESP32 firmware, a Next.js web app and API, PostgreSQL with Prisma, Neon database deployment, Netlify hosting, and supporting documentation and CI.

## Final project status

The final project includes both a real ESP32 hardware demo and a software simulator for testing. The ESP32 device can connect to Wi-Fi, authenticate with the backend, synchronize its sensors, submit live readings, update its online/offline status, and trigger emergency alerts through the web application.

The web application supports site management, device management, sensor readings, emergency alerts, push/PWA behavior, audit-related flows, and a site-level security mode that controls intrusion alert behavior.

## Overview

The system monitors sensor activity, evaluates readings, stores sensor history, and records alerts and audit events. The repository is organized as a monorepo using npm workspaces.

SEAS separates safety alerts from security alerts:

- safety alerts, such as flame and gas/smoke detection, are always treated as urgent
- security alerts, such as motion and door activity, depend on whether the site is armed or disarmed

## Main capabilities

- ESP32-based sensing for gas/smoke, flame, motion, and door status
- Device provisioning and authentication
- Device sensor synchronization with backend `sensor_id` mapping
- Live ESP32 reading submission through `/api/readings`
- Site, device, and sensor management
- Site-level armed/disarmed security mode
- Sensor readings, emergency events, alerts, and audit logs
- Critical alert popups in the app
- Device online/offline status based on recent readings
- Push notifications
- PWA and offline dashboard support
- Local firmware simulation for development and fallback testing

## Final ESP32 hardware demo

The physical ESP32 firmware supports the final defense demo flow:

1. connect to Wi-Fi
2. check whether the device is already provisioned
3. authenticate with `/api/devices/auth`
4. synchronize sensors through `/api/devices/sensors/sync`
5. map returned backend sensor IDs to local ESP32 sensors
6. send readings to `/api/readings`
7. update device status to online while readings are being received
8. allow the backend to mark the device offline when readings stop
9. trigger alert behavior when abnormal sensor states are received

The final hardware setup uses these sensors:

| Sensor | Purpose | Reading meaning |
|---|---|---|
| PIR motion sensor | Detects movement | `0` = no motion, `1` = motion detected |
| Flame sensor | Detects flame/fire | `0` = no flame, `1` = flame detected |
| Reed switch | Detects door state | `0` = closed, `1` = open |
| Gas/smoke sensor | Detects gas or smoke threshold | `0` = normal, `1` = gas/smoke detected |

The frontend displays these boolean readings as meaningful labels such as `No motion`, `Door closed`, `No flame`, and `Normal` instead of raw values like `0 boolean`.

## Alert logic

SEAS uses different rules for safety and security events.

| Sensor event | Condition | Alert behavior |
|---|---|---|
| Flame detected | Always | Creates a critical safety alert |
| Gas/smoke detected | Always when sensor threshold is reached | Creates a critical safety alert |
| Motion detected | Site is armed | Creates an intrusion alert |
| Door opened | Site is armed | Creates an intrusion alert |
| Motion or door activity | Site is disarmed | Stored as readings only |

This prevents normal movement or normal door usage from creating false intrusion alerts while still keeping fire and gas/smoke detection active at all times.

## Security mode

Each site has a security mode:

- `disarmed` — motion and door activity are stored as readings only
- `armed` — motion and door activity can create intrusion alerts

The site details page includes a web control under Site Actions to arm or disarm the site. This allows the final demo to show both normal monitoring behavior and intrusion alert behavior without editing the database manually.

## Domain model

Core entities include:

- `User`
- `Site` and `SiteUser`
- `Device`
- `Sensor`
- `SensorReading`
- `EmergencyEvent`
- `AlertNotification`
- `PushSubscription`
- `AuditLog`

The `Site` model also includes `security_mode`, which controls whether motion and door readings can create intrusion alerts.

## Repository structure

- `apps/web` — Next.js app, API routes, UI components, utilities, and tests
- `firmware` — ESP32 firmware support files, local device config, and simulator
- `prisma` — Prisma schema, config, and migrations
- `docs` — ER diagram and schema description
- `docker` — local PostgreSQL Docker Compose setup
- `.github` — GitHub Actions CI workflow

## Architecture

### Firmware

The `firmware` folder contains the ESP32-side project support files. It includes the physical ESP32 firmware work and a Python simulator for local development and fallback testing.

The ESP32 firmware supports:

- Wi-Fi connection
- stored device secret reuse
- device authentication
- sensor synchronization
- backend sensor ID mapping
- live reading submission
- serial monitor logging
- alert input generation through real sensor changes

The simulator remains useful for development because it can send repeatable virtual readings without requiring the physical device.

### Web application

The `apps/web` workspace contains the dashboard and API in one Next.js application. It includes:

- authentication and profile management
- devices, sensors, sites, readings, alerts, and audit logs
- site armed/disarmed security mode control
- push notification support
- PWA/offline pages and service worker assets
- Jest tests for core application flows

### Database

The data layer uses PostgreSQL and Prisma. The schema and migration history are in `prisma/`.

The local database can run through PostgreSQL or Docker. The deployed database is hosted on Neon.

Prisma uses:

- `DATABASE_URL` for runtime access, usually the pooled Neon URL in production
- `DIRECT_URL` for direct migration access, usually the non-pooled Neon URL

The project also supports a separate `.env.neon` file for running Prisma commands against the Neon database.

### Documentation and CI

- `docs/erd-description.md` and `docs/er-diagram.drawio` document the data model
- `docker/docker-compose.yml` provides a local database container
- `.github/workflows/ci.yml` runs the CI workflow

## Tech stack

- Next.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Neon
- Netlify
- Tailwind CSS
- Jest
- GitHub Actions
- ESP32 / Arduino framework
- Python 3 for the simulator

## Getting started

### Prerequisites

- Node.js and npm
- PostgreSQL, or Docker for the local database container
- Python 3 for the firmware simulator
- ESP32 toolchain if hardware flashing is required

### Configure environment

Create or update the required environment files with values for:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`

Keep secrets in local `.env` files and do not commit them.

For Neon, use:

```env
DATABASE_URL="your pooled Neon connection string"
DIRECT_URL="your direct Neon connection string"
```

For local development, use your local PostgreSQL connection string.

## Notes

- `firmware/config.json` and `firmware/device_secret.txt` are intentionally ignored by Git
- `apps/web/public/sw.js`, `apps/web/public/offline.html`, and the PWA components support offline usage
- Firmware-specific instructions are in `firmware/README.md`
- Do not commit real database URLs, JWT secrets, or ESP32 device secrets

## Summary

SEAS provides an end-to-end emergency monitoring workflow using ESP32 hardware, a Next.js web dashboard, Prisma/PostgreSQL data storage, and alert logic for safety and security events. The final implementation supports real sensor readings, backend device authentication, sensor synchronization, emergency alert generation, online/offline device state, and web-controlled site security mode.
