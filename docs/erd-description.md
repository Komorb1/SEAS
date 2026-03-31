# Entity Relationship Diagram (ERD) Description  
## Smart Emergency Alert System

This document describes the data model of the Smart Emergency Alert System.

The system follows an event-driven architecture where IoT devices send sensor readings to a backend service. The backend evaluates readings, generates emergency events when necessary, and notifies users through a web dashboard and PWA push notifications.

# 1. System Overview

The system workflow is as follows:

1. A **Device** installed at a **Site** collects data from connected **Sensors**.
2. Sensors generate **SensorReadings** and transmit them to the backend.
3. When abnormal conditions or threshold violations are detected, the backend creates an **EmergencyEvent**.
4. The system automatically creates **AlertNotifications** for users associated with the affected site.
5. Users receive notifications via **PushSubscription** (Web Push / PWA).
6. User and system actions are recorded in the **AuditLog**.

The model supports:

- Multiple users per site  
- Multiple devices per site  
- Multiple sensors per device  
- Sensor-level and device-level emergency events  
- Full event traceability  

# 2. Core Entities

## 2.1 User

Represents a registered dashboard user.

Users can:
- Access one or more sites
- Receive emergency notifications
- Subscribe to push notifications
- Acknowledge or resolve events

Each user has authentication credentials and account status.

## 2.2 Site

Represents a physical location such as:

- A house  
- A shop  
- A bank branch  
- A hospital wing  

Each site:

- Hosts multiple devices  
- Has multiple associated users  
- Can generate multiple emergency events  

## 2.3 SiteUser (Access Control)

Implements a many-to-many relationship between **User** and **Site**.

This entity:

- Defines which users have access to which sites  
- Stores the role of the user within that site (owner, admin, viewer)  

This allows:

- Multiple users per site  
- A user to access multiple sites

## 2.4 Device

Represents an IoT unit installed at a site.

Each device:

- Belongs to one site  
- Contains multiple sensors  
- Can generate device-level emergency events (e.g., offline, tamper, malfunction)  

Devices authenticate with the backend using a secure key.

## 2.5 Sensor

Represents a physical sensor attached to a device.

Possible sensor types include:

- Gas  
- Smoke  
- Flame  
- Motion  
- Door    

Each sensor:

- Belongs to one device  
- Generates sensor readings  
- May trigger emergency events  

## 2.6 SensorReading

Represents raw telemetry data sent by a sensor.

Each reading:

- Belongs to one sensor  
- Contains measurement values  
- Includes timestamps for recording and reception  
- May optionally be linked to an emergency event  

SensorReadings provide historical monitoring and support event analysis.

## 2.7 EmergencyEvent

Represents a detected incident.

An EmergencyEvent:

- Belongs to one site  
- Is triggered by either:
  - A specific sensor (sensor-level event), or  
  - A device (device-level event)  
- Produces alert notifications  
- Is tracked in the audit log

### Example Event Types

- Gas detected  
- Smoke detected  
- Intrusion detected  
- Device offline  
- Device tampered  

### Important Constraint

At least one of the following must be present:

- `sensor_id`
- `device_id`

This ensures that every event has a valid source.

## 2.8 AlertNotification

Represents a notification sent to a user regarding an emergency event.

Each alert:

- Belongs to one emergency event  
- Is sent to one user  
- Has a delivery status (queued, sent, delivered, failed)  

This entity maintains a historical record of all user notifications.

## 2.9 PushSubscription

Represents a PWA push subscription for a user.

Each subscription:

- Belongs to one user  
- Contains cryptographic keys required for Web Push  
- May represent a browser or mobile device  

A user may have multiple subscriptions (e.g., phone and laptop).

## 2.10 AuditLog

Tracks significant system actions.

AuditLog records:

- User actions (acknowledge, resolve, login, configuration changes)  
- System actions (automatic event creation, notification sending)  

This ensures traceability and accountability.

# 3. Design Principles

The ERD follows these principles:

- Clear separation between raw telemetry (SensorReading) and logical incidents (EmergencyEvent)  
- Strict foreign key relationships for data integrity  
- Event-driven notification architecture  
- Support for multi-user and multi-site environments  
- Extensibility for future features  

The design avoids redundancy while preserving flexibility for future enhancements such as:

- Organization-level grouping  
- Advanced rule engines  
- Multi-channel notifications (SMS, Email)  
- Authority dispatch integration

# 4. Conclusion

The ERD provides a scalable and realistic foundation for an IoT-based Smart Emergency Alert System.

It supports:

- Real-time hazard detection  
- Automatic user notification  
- Multi-user access control  
- Device health monitoring  
- Full audit traceability  

This model balances simplicity and extensibility, making it suitable for both academic and production-oriented implementations.

## edit: remember to edit the er-diagram at device entity {installed_at changed into location_label} attribute
