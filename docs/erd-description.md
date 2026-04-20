# Entity Relationship Diagram (ERD) Description  
## Smart Emergency Alert System

This document reflects `prisma/schema.prisma` as the source of truth.

The system centers on sites, devices, sensors, emergency events, notifications, and audit logging.

Workflow:
1. A `Device` assigned to a `Site` collects telemetry from attached `Sensor` records.
2. `SensorReading` records store measurements and may optionally link to an `EmergencyEvent`.
3. `EmergencyEvent` may reference a Device, a Sensor, or both; the schema does not enforce a database-level check requiring at least one.
4. `AlertNotification` records are created for affected users.
5. Users subscribe to notifications through `PushSubscription`.
6. User and system activity is captured in `AuditLog`.

Supported concepts:
- Multiple users per site
- Multiple devices per site
- Multiple sensors per device
- Sensor-level and device-level emergency events
- Push notification delivery
- Soft delete for `Site` and `Device`

# 2. Enums

- `UserStatus`: `active`, `disabled`
- `SiteStatus`: `active`, `inactive`
- `SiteUserRole`: `owner`, `admin`, `viewer`
- `DeviceStatus`: `online`, `offline`, `maintenance`
- `SensorType`: `gas`, `smoke`, `flame`, `motion`, `door`
- `SensorStatus`: `ok`, `faulty`, `disabled`
- `ReadingQualityFlag`: `ok`, `suspect`
- `EventType`: `gas`, `smoke`, `flame`, `intrusion`, `device_offline`, `tamper`, `other`
- `Severity`: `low`, `medium`, `high`, `critical`
- `EventStatus`: `new`, `acknowledged`, `resolved`, `false_alarm`
- `AlertChannel`: `web_push`, `email`, `sms`
- `AlertStatus`: `queued`, `sent`, `delivered`, `failed`
- `AuditActionType`: `create_event`, `update_event`, `ack`, `resolve`, `login`, `logout`, `update_settings`, `update_profile`, `other`
- `AuditTargetType`: `user`, `site`, `device`, `sensor`, `event`, `subscription`, `other`

# 3. Core Entities

## 3.1 User

- Fields: `user_id` UUID PK, default `uuid()`; `full_name` required; `username` required and unique; `email` required and unique; `phone` optional; `password_hash` required; `status` default `active`; `last_login_at` optional; `created_at` default `now()`.
- Relations: `site_users`, `alert_notifications` (`AlertRecipient`), `push_subscriptions`, `audit_logs`.
- Indexes: `status`.
- Notes: no soft-delete fields.

## 3.2 Site

- Fields: `site_id` UUID PK, default `uuid()`; `name` required; `address_line` optional; `city` optional; `country` optional; `status` default `active`; `created_at` default `now()`; `is_deleted` default `false`; `deleted_at` optional.
- Relations: `site_users`, `devices`, `emergency_events`.
- Indexes: `is_deleted`, `status`.
- Notes: soft delete is implemented with `is_deleted` and `deleted_at`.

## 3.3 SiteUser

- Fields: `site_id` UUID FK; `user_id` UUID FK; `role` default `viewer`; `created_at` default `now()`.
- Primary key: composite `(site_id, user_id)`.
- Relations: `site` `onDelete: Cascade`, `user` `onDelete: Cascade`.
- Indexes: `user_id`.

## 3.4 Device

- Fields: `device_id` UUID PK, default `uuid()`; `site_id` UUID FK; `serial_number` unique; `device_type` required; `secret_hash` optional; `location_label` optional; `last_seen_at` optional; `status` default `offline`; `created_at` default `now()`; `is_deleted` default `false`; `deleted_at` optional.
- Relations: `site` `onDelete: Cascade`, `sensors`, `emergency_events` (`EventDevice`).
- Indexes: `is_deleted`, `site_id`, `status`, `last_seen_at`.

## 3.5 Sensor

- Fields: `sensor_id` UUID PK, default `uuid()`; `device_id` UUID FK; `external_key` required; `sensor_type` required; `location_label` optional; `is_enabled` default `true`; `status` default `ok`; `installed_at` optional.
- Relations: `device` `onDelete: Cascade`, `readings`, `emergency_events` (`EventSensor`).
- Unique constraints: `(device_id, external_key)`.
- Indexes: `device_id`, `sensor_type`, `status`.

## 3.6 SensorReading

- Fields: `reading_id` UUID PK, default `uuid()`; `sensor_id` UUID FK; `value` `Decimal(18,6)`; `unit` optional; `recorded_at` optional; `received_at` default `now()`; `quality_flag` default `ok`; `event_id` optional UUID FK.
- Relations: `sensor` `onDelete: Cascade`, `event` (`EventReadings`) `onDelete: SetNull`.
- Indexes: `(sensor_id, received_at)`, `event_id`.

## 3.7 EmergencyEvent

- Fields: `event_id` UUID PK, default `uuid()`; `site_id` UUID FK; `device_id` optional UUID FK; `sensor_id` optional UUID FK; `event_type` required; `severity` required; `status` default `new`; `title` optional; `description` optional; `started_at` required; `acknowledged_at` optional; `resolved_at` optional; `created_at` default `now()`.
- Relations: `site` `onDelete: Cascade`, `device` (`EventDevice`) `onDelete: SetNull`, `sensor` (`EventSensor`) `onDelete: SetNull`, `alert_notifications`, `audit_logs`, `readings` (`EventReadings`).
- Indexes: `(site_id, started_at)`, `device_id`, `sensor_id`, `status`, `severity`.
- Notes: the schema does not enforce the “at least one of `device_id` or `sensor_id`” rule as a database constraint.

## 3.8 AlertNotification

- Fields: `alert_id` UUID PK, default `uuid()`; `event_id` UUID FK; `recipient_user_id` UUID FK; `channel` default `web_push`; `status` default `queued`; `sent_at` optional; `delivered_at` optional; `error_message` optional; `created_at` default `now()`.
- Relations: `event` `onDelete: Cascade`, `recipient` (`AlertRecipient`) `onDelete: Cascade`.
- Indexes: `event_id`, `(recipient_user_id, status)`.

## 3.9 PushSubscription

- Fields: `subscription_id` UUID PK, default `uuid()`; `user_id` UUID FK; `endpoint` unique; `p256dh_key` required; `auth_key` required; `user_agent` optional; `device_label` optional; `is_active` default `true`; `created_at` default `now()`; `revoked_at` optional.
- Relations: `user` `onDelete: Cascade`.
- Indexes: `(user_id, is_active)`.

## 3.10 AuditLog

- Fields: `log_id` UUID PK, default `uuid()`; `user_id` optional UUID FK; `event_id` optional UUID FK; `action_type` required; `target_type` required; `target_id` optional; `details` optional JSON; `created_at` default `now()`.
- Relations: `user` `onDelete: SetNull`, `event` `onDelete: SetNull`.
- Indexes: `(user_id, created_at)`, `(event_id, created_at)`, `action_type`.

# 4. Design Notes

- `Site` and `Device` are the only models with soft-delete fields.
- The ERD diagram shows model relationships and field names, but indexes, unique constraints, enum values, and defaults are documented here.
- Ambiguous rename resolved from schema: `Device.installed_at` in the diagram corresponds to `Device.location_label` in the current schema.

# 5. Conclusion

The ERD now matches the current Prisma schema for models, fields, enums, relations, constraints, defaults, nullability, and soft-delete behavior.
