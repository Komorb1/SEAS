import { evaluateReadingForEvent } from "@/lib/events/evaluate-reading";

type EvaluationInput = Parameters<typeof evaluateReadingForEvent>[0];

const evaluate = (
  input: Omit<EvaluationInput, "securityMode"> &
    Partial<Pick<EvaluationInput, "securityMode">>
) =>
  evaluateReadingForEvent({
    securityMode: "armed" as EvaluationInput["securityMode"],
    ...input,
  });

describe("evaluateReadingForEvent", () => {
  describe("gas sensor", () => {
    it("returns null for normal gas readings", () => {
      expect(evaluate({ sensorType: "gas", rawValue: "299" })).toBeNull();
    });

    it("returns a high gas event at the warning threshold", () => {
      expect(evaluate({ sensorType: "gas", rawValue: "300" })).toEqual({
        event_type: "gas",
        severity: "high",
        title: "High gas level detected",
        description: "Gas reading reached 300.",
      });
    });

    it("returns a critical gas event at the critical threshold", () => {
      expect(evaluate({ sensorType: "gas", rawValue: "600" })).toEqual({
        event_type: "gas",
        severity: "critical",
        title: "Critical gas level detected",
        description: "Gas reading reached 600. Immediate action recommended.",
      });
    });
  });

  describe("smoke sensor", () => {
    it("returns null for normal smoke readings", () => {
      expect(evaluate({ sensorType: "smoke", rawValue: "199" })).toBeNull();
    });

    it("returns a high smoke event at the warning threshold", () => {
      expect(evaluate({ sensorType: "smoke", rawValue: "200" })).toEqual({
        event_type: "smoke",
        severity: "high",
        title: "High smoke level detected",
        description: "Smoke reading reached 200.",
      });
    });

    it("returns a critical smoke event at the critical threshold", () => {
      expect(evaluate({ sensorType: "smoke", rawValue: "400" })).toEqual({
        event_type: "smoke",
        severity: "critical",
        title: "Critical smoke level detected",
        description: "Smoke reading reached 400. Immediate action recommended.",
      });
    });
  });

  describe("flame sensor", () => {
    it("returns null when flame is not detected", () => {
      expect(evaluate({ sensorType: "flame", rawValue: "0" })).toBeNull();
    });

    it("returns a critical flame event when flame is detected", () => {
      expect(evaluate({ sensorType: "flame", rawValue: "1" })).toEqual({
        event_type: "flame",
        severity: "critical",
        title: "Flame detected",
        description: "Flame sensor reported a detection.",
      });
    });
  });

  describe("motion sensor", () => {
    it("returns null when no motion is detected", () => {
      expect(evaluate({ sensorType: "motion", rawValue: "0" })).toBeNull();
    });

    it("returns an intrusion event when motion is detected while armed", () => {
      expect(evaluate({ sensorType: "motion", rawValue: "1" })).toEqual({
        event_type: "intrusion",
        severity: "high",
        title: "Motion detected",
        description: "Motion sensor reported activity while the site is armed.",
      });
    });

    it("returns null when motion is detected while disarmed", () => {
      expect(
        evaluate({
          sensorType: "motion",
          rawValue: "1",
          securityMode: "disarmed" as EvaluationInput["securityMode"],
        })
      ).toBeNull();
    });
  });

  describe("door sensor", () => {
    it("returns null when the door is closed", () => {
      expect(evaluate({ sensorType: "door", rawValue: "0" })).toBeNull();
    });

    it("returns an intrusion event when the door is opened while armed", () => {
      expect(evaluate({ sensorType: "door", rawValue: "1" })).toEqual({
        event_type: "intrusion",
        severity: "high",
        title: "Door opened",
        description: "Door sensor reported an open state while the site is armed.",
      });
    });

    it("returns null when the door is opened while disarmed", () => {
      expect(
        evaluate({
          sensorType: "door",
          rawValue: "1",
          securityMode: "disarmed" as EvaluationInput["securityMode"],
        })
      ).toBeNull();
    });
  });

  describe("invalid or non-numeric values", () => {
    it("returns null for non-numeric strings", () => {
      expect(evaluate({ sensorType: "gas", rawValue: "abc" })).toBeNull();
    });

    it("returns null for Infinity", () => {
      expect(evaluate({ sensorType: "smoke", rawValue: "Infinity" })).toBeNull();
    });

    it("returns null for NaN", () => {
      expect(evaluate({ sensorType: "door", rawValue: "NaN" })).toBeNull();
    });
  });
});