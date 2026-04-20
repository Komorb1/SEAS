# Smart Emergency Alert System using ESP32 (SEAS)

SEAS is a software engineering capstone project for real-time emergency monitoring. It combines ESP32 firmware, a Next.js web app and API, PostgreSQL with Prisma, and supporting documentation and CI.

## Overview

The system monitors sensor activity, evaluates readings, and records alerts and audit events. The repository is organized as a monorepo using npm workspaces.

## Main capabilities

- ESP32-based sensing for gas, smoke/flame, motion, and door status
- Device provisioning and authentication
- Site, device, and sensor management
- Sensor readings, emergency events, alerts, and audit logs
- Push notifications
- PWA and offline dashboard support
- Local firmware simulation for development

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

## Repository structure

- `apps/web` — Next.js app, API routes, UI components, utilities, and tests
- `firmware` — ESP32 support files, local device config, and simulator
- `prisma` — Prisma schema, config, and migrations
- `docs` — ER diagram and schema description
- `docker` — local PostgreSQL Docker Compose setup
- `.github` — GitHub Actions CI workflow

## Architecture

### Firmware
The `firmware` folder contains the ESP32-side project support files. It includes a simulator for local development and local-only device configuration files.

### Web application
The `apps/web` workspace contains the dashboard and API in one Next.js application. It includes:
- authentication and profile management
- devices, sensors, sites, readings, alerts, and audit logs
- push notification support
- PWA/offline pages and service worker assets
- Jest tests for core application flows

### Database
The data layer uses PostgreSQL and Prisma. The schema and migration history are in `prisma/`. Prisma uses `DATABASE_URL` for runtime access and `DIRECT_URL` for migrations.

### Documentation and CI
- `docs/erd-description.md` and `docs/er-diagram.drawio` document the data model
- `docker/docker-compose.yml` provides a local database container
- `.github/workflows/ci.yml` runs the CI workflow

## Tech stack

- Next.js
- TypeScript
- Prisma ORM
- PostgreSQL
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

## Testing

The web workspace uses Jest. Tests live in `apps/web/src/__tests__` and cover authentication, device management, sensors, sites, readings, alerts, and audit-related flows.

## Notes

- `firmware/config.json` and `firmware/device_secret.txt` are intentionally ignored by Git
- `apps/web/public/sw.js`, `apps/web/public/offline.html`, and the PWA components support offline usage
- Firmware-specific instructions are in `firmware/README.md`