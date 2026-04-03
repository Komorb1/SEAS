from __future__ import annotations

import argparse
import json
import random
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import error, request


CONFIG_PATH = Path(__file__).with_name("config.json")
DEVICE_SECRET_PATH = Path(__file__).with_name("device_secret.txt")
DEFAULT_QUALITY_FLAG = "ok"
SUPPORTED_MODES = {"single", "burst", "continuous"}
SUPPORTED_SCENARIOS = {"normal", "gas_leak", "fire", "intrusion", "mixed"}


@dataclass
class SensorConfig:
    external_key: str
    sensor_type: str
    location_label: str
    unit: str
    sensor_id: Optional[str] = None


@dataclass
class AppConfig:
    base_url: str
    device_serial_number: str
    interval_seconds: int
    request_timeout_seconds: int
    sensors: List[SensorConfig] = field(default_factory=list)


class SimulatorError(Exception):
    pass


def log(level: str, message: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {message}")


def parse_sensor_entry(name: str, raw: Dict[str, Any]) -> SensorConfig:
    external_key = str(raw.get("external_key") or name)
    sensor_type = str(raw.get("sensor_type") or name)
    return SensorConfig(
        external_key=external_key,
        sensor_type=sensor_type,
        location_label=str(raw.get("location_label") or f"{sensor_type.title()} sensor"),
        unit=str(raw.get("unit") or default_unit_for_sensor_type(sensor_type)),
    )



def load_config(path: Path) -> AppConfig:
    if not path.exists():
        raise SimulatorError(
            f"Missing config file: {path}\n"
            f"Copy config.example.json to config.json and fill in your real values."
        )

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SimulatorError(f"Invalid JSON in {path}: {exc}") from exc

    try:
        raw_sensors = data["sensors"]
        sensors: List[SensorConfig] = []

        if isinstance(raw_sensors, list):
            for index, sensor in enumerate(raw_sensors, start=1):
                if not isinstance(sensor, dict):
                    raise SimulatorError(
                        f"Sensor entry #{index} must be an object, got {type(sensor).__name__}"
                    )
                sensors.append(parse_sensor_entry(f"sensor-{index}", sensor))
        elif isinstance(raw_sensors, dict):
            for name, sensor in raw_sensors.items():
                if not isinstance(sensor, dict):
                    raise SimulatorError(
                        f"Sensor '{name}' must be an object, got {type(sensor).__name__}"
                    )
                sensors.append(parse_sensor_entry(str(name), sensor))
        else:
            raise SimulatorError("'sensors' must be either an object or an array")

        if not sensors:
            raise SimulatorError("config must contain at least one sensor")

        return AppConfig(
            base_url=str(data["base_url"]).rstrip("/"),
            device_serial_number=str(data["device_serial_number"]),
            interval_seconds=int(data.get("interval_seconds", 5)),
            request_timeout_seconds=int(data.get("request_timeout_seconds", 15)),
            sensors=sensors,
        )
    except KeyError as exc:
        raise SimulatorError(f"Missing required config key: {exc}") from exc



def read_stored_secret(path: Path) -> Optional[str]:
    if not path.exists():
        return None

    secret = path.read_text(encoding="utf-8").strip()
    return secret or None



def write_stored_secret(path: Path, secret: str) -> None:
    path.write_text(secret, encoding="utf-8")



def http_json(
    url: str,
    method: str,
    payload: Dict[str, Any],
    timeout: int,
    token: Optional[str] = None,
) -> tuple[int, Dict[str, Any]]:
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = request.Request(url=url, data=body, headers=headers, method=method)

    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw) if raw else {}
            return resp.status, data
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            data = {"error": raw or exc.reason}
        return exc.code, data
    except error.URLError as exc:
        raise SimulatorError(f"Network error calling {url}: {exc}") from exc



def default_unit_for_sensor_type(sensor_type: str) -> str:
    sensor_type = sensor_type.lower()
    if sensor_type == "gas":
        return "ppm"
    if sensor_type in {"flame", "motion", "door", "smoke"}:
        return "state"
    return "value"



def generate_sensor_value(sensor_type: str, scenario: str, cycle_number: int) -> int:
    sensor_type = sensor_type.lower()

    if sensor_type == "gas":
        if scenario == "normal":
            return random.randint(90, 180)
        if scenario == "gas_leak":
            return random.randint(620, 780)
        if scenario == "mixed":
            if cycle_number % 5 == 0:
                return random.randint(650, 800)
            if cycle_number % 3 == 0:
                return random.randint(320, 520)
            return random.randint(100, 190)
        return random.randint(90, 180)

    if sensor_type in {"flame", "smoke"}:
        if scenario == "fire":
            return 1
        if scenario == "mixed":
            return 1 if cycle_number % 4 == 0 else 0
        return 0

    if sensor_type in {"motion", "door"}:
        if scenario == "intrusion":
            return 1
        if scenario == "mixed":
            return 1 if cycle_number % 3 == 0 else 0
        return 0

    if scenario == "mixed" and cycle_number % 4 == 0:
        return random.randint(70, 100)
    return random.randint(0, 50)



def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SEAS device simulator")
    parser.add_argument(
        "scenario",
        nargs="?",
        default="normal",
        choices=sorted(SUPPORTED_SCENARIOS),
        help="reading scenario to simulate",
    )
    parser.add_argument(
        "--mode",
        default="continuous",
        choices=sorted(SUPPORTED_MODES),
        help="single = 1 cycle, burst = N cycles, continuous = forever",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="number of cycles for burst mode",
    )
    parser.add_argument(
        "--sensor",
        action="append",
        dest="sensors",
        help="sensor type to include; repeat to include more than one",
    )
    parser.add_argument(
        "--all-sensors",
        action="store_true",
        help="send readings for every sensor in config",
    )
    return parser.parse_args()


class SeasSimulator:
    def __init__(
        self,
        config: AppConfig,
        scenario: str,
        mode: str,
        burst_count: int,
        selected_sensor_types: Optional[List[str]] = None,
        include_all_sensors: bool = False,
    ) -> None:
        self.config = config
        self.scenario = scenario
        self.mode = mode
        self.burst_count = burst_count
        self.device_token: Optional[str] = None
        self.token_expires_at = 0.0
        self.cycle_count = 0
        self.device_secret: Optional[str] = read_stored_secret(DEVICE_SECRET_PATH)
        self.include_all_sensors = include_all_sensors
        self.selected_sensor_types = [s.lower() for s in (selected_sensor_types or [])]

        self.provision_url = f"{self.config.base_url}/api/devices/provision"
        self.auth_url = f"{self.config.base_url}/api/devices/auth"
        self.sync_sensors_url = f"{self.config.base_url}/api/devices/sensors/sync"
        self.readings_url = f"{self.config.base_url}/api/readings"

    def provision(self) -> None:
        log("INFO", f"Provisioning device '{self.config.device_serial_number}'...")

        status, data = http_json(
            url=self.provision_url,
            method="POST",
            payload={
                "serial_number": self.config.device_serial_number,
            },
            timeout=self.config.request_timeout_seconds,
        )

        if status != 200:
            raise SimulatorError(f"Provisioning failed ({status}): {data}")

        secret = data.get("device_secret")
        if not secret or not isinstance(secret, str):
            raise SimulatorError(
                f"Provisioning response missing device_secret: {data}"
            )

        write_stored_secret(DEVICE_SECRET_PATH, secret)
        self.device_secret = secret

        log("OK", f"Provisioning succeeded. Secret stored in {DEVICE_SECRET_PATH.name}.")

    def ensure_secret(self) -> None:
        if self.device_secret:
            return
        self.provision()

    def authenticate(self) -> None:
        self.ensure_secret()

        log("INFO", f"Authenticating device '{self.config.device_serial_number}'...")

        status, data = http_json(
            url=self.auth_url,
            method="POST",
            payload={
                "serial_number": self.config.device_serial_number,
                "secret": self.device_secret,
            },
            timeout=self.config.request_timeout_seconds,
        )

        if status != 200:
            raise SimulatorError(f"Auth failed ({status}): {data}")

        token = data.get("device_token")
        expires_in = int(data.get("expires_in_seconds", 0))

        if not token or expires_in <= 0:
            raise SimulatorError(f"Auth response missing token or expiry: {data}")

        self.device_token = token
        self.token_expires_at = time.time() + expires_in - 30

        log(
            "OK",
            f"Authentication succeeded. Token expires in about {expires_in} seconds."
        )

    def ensure_token(self) -> None:
        if not self.device_token or time.time() >= self.token_expires_at:
            self.authenticate()

    def get_target_sensors(self) -> List[SensorConfig]:
        if self.include_all_sensors or not self.selected_sensor_types:
            return self.config.sensors

        selected = [
            sensor
            for sensor in self.config.sensors
            if sensor.sensor_type.lower() in self.selected_sensor_types
        ]

        if not selected:
            available = ", ".join(sorted({sensor.sensor_type for sensor in self.config.sensors}))
            requested = ", ".join(self.selected_sensor_types)
            raise SimulatorError(
                f"No configured sensors matched --sensor {requested}. Available sensor types: {available}"
            )

        return selected

    def sync_sensors(self) -> None:
        self.ensure_token()
        target_sensors = self.get_target_sensors()

        log("INFO", f"Syncing {len(target_sensors)} sensor(s)...")

        payload = {
            "sensors": [
                {
                    "external_key": sensor.external_key,
                    "sensor_type": sensor.sensor_type,
                    "location_label": sensor.location_label,
                }
                for sensor in target_sensors
            ]
        }

        status, data = http_json(
            url=self.sync_sensors_url,
            method="POST",
            payload=payload,
            timeout=self.config.request_timeout_seconds,
            token=self.device_token,
        )

        if status != 200:
            raise SimulatorError(f"Sensor sync failed ({status}): {data}")

        synced_sensors = data.get("sensors")
        if not isinstance(synced_sensors, list) or not synced_sensors:
            raise SimulatorError(f"Sensor sync response missing sensors: {data}")

        sensors_by_external_key = {
            str(sensor.get("external_key")): sensor
            for sensor in synced_sensors
            if isinstance(sensor, dict)
        }

        for sensor in target_sensors:
            synced = sensors_by_external_key.get(sensor.external_key)
            if not synced:
                raise SimulatorError(
                    f"Sensor sync response missing sensor for external_key={sensor.external_key}"
                )

            sensor_id = synced.get("sensor_id")
            if not sensor_id or not isinstance(sensor_id, str):
                raise SimulatorError(f"Sensor sync response missing sensor_id: {synced}")

            sensor.sensor_id = sensor_id
            log(
                "OK",
                f"Sensor ready: type={sensor.sensor_type} external_key={sensor.external_key} sensor_id={sensor.sensor_id}"
            )

    def ensure_synced_sensors(self) -> None:
        unsynced = [sensor for sensor in self.get_target_sensors() if not sensor.sensor_id]
        if not unsynced:
            return
        self.sync_sensors()

    def build_reading_payload(self, sensor: SensorConfig) -> Dict[str, Any]:
        if not sensor.sensor_id:
            raise SimulatorError(f"Sensor {sensor.external_key} is missing sensor_id")

        value = generate_sensor_value(
            sensor_type=sensor.sensor_type,
            scenario=self.scenario,
            cycle_number=self.cycle_count,
        )

        return {
            "sensor_id": sensor.sensor_id,
            "value": value,
            "unit": sensor.unit,
            "recorded_at": datetime.now(timezone.utc)
            .replace(microsecond=0)
            .strftime("%Y-%m-%dT%H:%M:%SZ"),
            "quality_flag": DEFAULT_QUALITY_FLAG,
        }

    def send_one_reading(self, sensor: SensorConfig) -> None:
        self.ensure_token()
        payload = self.build_reading_payload(sensor)

        log(
            "INFO",
            f"Sending {sensor.sensor_type} reading value={payload['value']} {payload['unit']} "
            f"scenario={self.scenario} cycle={self.cycle_count}"
        )

        status, data = http_json(
            url=self.readings_url,
            method="POST",
            payload=payload,
            timeout=self.config.request_timeout_seconds,
            token=self.device_token,
        )

        if status != 201:
            log(
                "ERROR",
                f"Reading submission failed for {sensor.sensor_type} ({status}): {data}"
            )
            return

        reading = data.get("reading", {})
        event = data.get("event")
        notifications_created = data.get("notifications_created", 0)

        log(
            "OK",
            f"Reading stored: sensor_type={sensor.sensor_type} reading_id={reading.get('reading_id')} "
            f"value={reading.get('value')} unit={reading.get('unit')}"
        )

        if event:
            log(
                "ALERT",
                f"Event created/reused: event_id={event.get('event_id')} "
                f"type={event.get('event_type')} severity={event.get('severity')} "
                f"notifications_created={notifications_created}"
            )

    def send_cycle(self) -> None:
        self.ensure_synced_sensors()
        target_sensors = self.get_target_sensors()
        log("INFO", f"Cycle {self.cycle_count}: sending {len(target_sensors)} reading(s)")
        for sensor in target_sensors:
            self.send_one_reading(sensor)

    def run(self) -> None:
        target_sensors = self.get_target_sensors()
        sensor_summary = ", ".join(sensor.sensor_type for sensor in target_sensors)

        log("INFO", f"Starting SEAS simulator scenario='{self.scenario}' mode='{self.mode}'")
        log("INFO", f"Base URL: {self.config.base_url}")
        log("INFO", f"Selected sensors: {sensor_summary}")
        if self.mode == "burst":
            log("INFO", f"Burst cycles: {self.burst_count}")
        if self.mode == "continuous":
            log("INFO", f"Interval: {self.config.interval_seconds}s")

        if self.mode == "single":
            self.cycle_count = 1
            self.send_cycle()
            return

        if self.mode == "burst":
            if self.burst_count <= 0:
                raise SimulatorError("--count must be greater than 0 in burst mode")
            for cycle in range(1, self.burst_count + 1):
                self.cycle_count = cycle
                self.send_cycle()
                if cycle < self.burst_count:
                    time.sleep(self.config.interval_seconds)
            return

        while True:
            self.cycle_count += 1
            try:
                self.send_cycle()
            except KeyboardInterrupt:
                log("INFO", "Simulator stopped by user.")
                raise
            except SimulatorError as exc:
                log("ERROR", str(exc))
            except Exception as exc:
                log("ERROR", f"Unexpected error: {exc}")

            time.sleep(self.config.interval_seconds)



def main() -> int:
    args = parse_args()

    try:
        config = load_config(CONFIG_PATH)
        simulator = SeasSimulator(
            config=config,
            scenario=args.scenario,
            mode=args.mode,
            burst_count=args.count,
            selected_sensor_types=args.sensors,
            include_all_sensors=args.all_sensors,
        )
        simulator.run()
        return 0
    except KeyboardInterrupt:
        return 0
    except SimulatorError as exc:
        log("ERROR", str(exc))
        return 1
    except Exception as exc:
        log("ERROR", f"Unexpected error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
