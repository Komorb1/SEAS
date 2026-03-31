from __future__ import annotations

import json
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib import error, request


CONFIG_PATH = Path(__file__).with_name("config.json")


@dataclass
class SensorConfig:
    sensor_id: str
    unit: str


@dataclass
class AppConfig:
    base_url: str
    device_serial_number: str
    device_secret: str
    interval_seconds: int
    request_timeout_seconds: int
    gas: SensorConfig


class SimulatorError(Exception):
    pass


def log(level: str, message: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {message}")


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
        gas = data["sensors"]["gas"]
        return AppConfig(
            base_url=str(data["base_url"]).rstrip("/"),
            device_serial_number=str(data["device_serial_number"]),
            device_secret=str(data["device_secret"]),
            interval_seconds=int(data.get("interval_seconds", 5)),
            request_timeout_seconds=int(data.get("request_timeout_seconds", 15)),
            gas=SensorConfig(
                sensor_id=str(gas["sensor_id"]),
                unit=str(gas.get("unit", "ppm")),
            ),
        )
    except KeyError as exc:
        raise SimulatorError(f"Missing required config key: {exc}") from exc


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


class SeasSimulator:
    def __init__(self, config: AppConfig, scenario: str) -> None:
        self.config = config
        self.scenario = scenario
        self.device_token: Optional[str] = None
        self.token_expires_at = 0.0
        self.loop_count = 0

        self.auth_url = f"{self.config.base_url}/api/devices/auth"
        self.readings_url = f"{self.config.base_url}/api/readings"

    def authenticate(self) -> None:
        log("INFO", f"Authenticating device '{self.config.device_serial_number}'...")

        status, data = http_json(
            url=self.auth_url,
            method="POST",
            payload={
                "serial_number": self.config.device_serial_number,
                "secret": self.config.device_secret,
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

    def generate_gas_value(self) -> int:
        """
        Backend thresholds:
        - >= 300 => high gas event
        - >= 600 => critical gas event
        """
        if self.scenario == "normal":
            return random.randint(90, 180)

        if self.scenario == "gas_leak":
            # Mostly dangerous values, with a little wobble so it looks alive.
            return random.randint(620, 780)

        if self.scenario == "mixed":
            # Every 5th reading turns dangerous.
            if self.loop_count > 0 and self.loop_count % 5 == 0:
                return random.randint(650, 800)
            return random.randint(100, 190)

        raise SimulatorError(
            f"Unsupported scenario '{self.scenario}'. "
            f"Use one of: normal, gas_leak, mixed"
        )

    def build_reading_payload(self) -> Dict[str, Any]:
        gas_value = self.generate_gas_value()

        return {
            "sensor_id": self.config.gas.sensor_id,
            "value": gas_value,
            "unit": self.config.gas.unit,
            "recorded_at": datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "quality_flag": "ok",
        }

    def send_reading(self) -> None:
        self.ensure_token()
        payload = self.build_reading_payload()

        log(
            "INFO",
            f"Sending gas reading value={payload['value']} {payload['unit']} "
            f"scenario={self.scenario}"
        )

        status, data = http_json(
            url=self.readings_url,
            method="POST",
            payload=payload,
            timeout=self.config.request_timeout_seconds,
            token=self.device_token,
        )

        if status != 201:
            log("ERROR", f"Reading submission failed ({status}): {data}")
            return

        reading = data.get("reading", {})
        event = data.get("event")
        notifications_created = data.get("notifications_created", 0)

        log(
            "OK",
            f"Reading stored: reading_id={reading.get('reading_id')} "
            f"value={reading.get('value')} unit={reading.get('unit')}"
        )

        if event:
            log(
                "ALERT",
                f"Event created/reused: "
                f"event_id={event.get('event_id')} "
                f"type={event.get('event_type')} "
                f"severity={event.get('severity')} "
                f"notifications_created={notifications_created}"
            )

    def run(self) -> None:
        log("INFO", f"Starting SEAS simulator in '{self.scenario}' mode")
        log("INFO", f"Base URL: {self.config.base_url}")
        log("INFO", f"Interval: {self.config.interval_seconds}s")

        while True:
            self.loop_count += 1
            try:
                self.send_reading()
            except SimulatorError as exc:
                log("ERROR", str(exc))
            except KeyboardInterrupt:
                log("INFO", "Simulator stopped by user.")
                raise
            except Exception as exc:
                log("ERROR", f"Unexpected error: {exc}")

            time.sleep(self.config.interval_seconds)


def main() -> int:
    scenario = sys.argv[1] if len(sys.argv) > 1 else "normal"

    try:
        config = load_config(CONFIG_PATH)
        simulator = SeasSimulator(config=config, scenario=scenario)
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