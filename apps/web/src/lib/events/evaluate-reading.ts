import { Severity, EventType, SensorType } from "@prisma/client";

type EvaluationInput = {
  sensorType: SensorType;
  rawValue: string;
};

type EventDraft = {
  event_type: EventType;
  severity: Severity;
  title: string;
  description: string;
};

function toNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function evaluateReadingForEvent(
  input: EvaluationInput
): EventDraft | null {
  const numericValue = toNumber(input.rawValue);
  if (numericValue === null) return null;

  switch (input.sensorType) {
    case "gas": {
      if (numericValue >= 600) {
        return {
          event_type: "gas",
          severity: "critical",
          title: "Critical gas level detected",
          description: `Gas reading reached ${numericValue}. Immediate action recommended.`,
        };
      }
      if (numericValue >= 300) {
        return {
          event_type: "gas",
          severity: "high",
          title: "High gas level detected",
          description: `Gas reading reached ${numericValue}.`,
        };
      }
      return null;
    }

    case "smoke": {
      if (numericValue >= 400) {
        return {
          event_type: "smoke",
          severity: "critical",
          title: "Critical smoke level detected",
          description: `Smoke reading reached ${numericValue}.`,
        };
      }
      if (numericValue >= 200) {
        return {
          event_type: "smoke",
          severity: "high",
          title: "High smoke level detected",
          description: `Smoke reading reached ${numericValue}.`,
        };
      }
      return null;
    }

    case "flame": {
      if (numericValue >= 1) {
        return {
          event_type: "flame",
          severity: "critical",
          title: "Flame detected",
          description: "Flame sensor reported a detection.",
        };
      }
      return null;
    }

    case "motion": {
      if (numericValue >= 1) {
        return {
          event_type: "intrusion",
          severity: "medium",
          title: "Motion detected",
          description: "Motion sensor reported activity.",
        };
      }
      return null;
    }

    case "door": {
      if (numericValue >= 1) {
        return {
          event_type: "intrusion",
          severity: "medium",
          title: "Door opened",
          description: "Door sensor reported an open state.",
        };
      }
      return null;
    }

    case "temp": {
      if (numericValue >= 80) {
        return {
          event_type: "other",
          severity: "critical",
          title: "Critical temperature detected",
          description: `Temperature reached ${numericValue}.`,
        };
      }
      if (numericValue >= 60) {
        return {
          event_type: "other",
          severity: "high",
          title: "High temperature detected",
          description: `Temperature reached ${numericValue}.`,
        };
      }
      return null;
    }

    default:
      return null;
  }
}