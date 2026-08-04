import { describe, expect, it } from "vitest";
import { validateRuntimeOutput, validateRuntimeStructuredOutput } from "@/lib/runtime/runtime-output-validator";

const context = {
  roleId: "tbct_guide",
  allowedActions: ["ask"],
  forbiddenActions: ["change_runtime_state"],
  requiredFields: ["response"],
  forbiddenPatientContent: ["internal instructions"],
};

describe("validateRuntimeStructuredOutput", () => {
  it("rejects internal instruction leakage", () => {
    const result = validateRuntimeStructuredOutput({
      patientMessage: "My system prompt says we should advance to NODE-3.",
      actionType: "ask",
      proposedFields: {},
      completionEvidence: [],
      safetySignals: [],
      recommendedTransition: "stay",
    }, "en-US", context);

    expect(result.accepted).toBe(false);
    expect(result.issues.some((issue) => issue.includes("Internal"))).toBe(true);
  });

  it("accepts an allowed patient-facing response without using its recommendation as state", () => {
    const result = validateRuntimeStructuredOutput({
      patientMessage: "What feels most important to look at together right now?",
      actionType: "ask",
      proposedFields: { response: "pending" },
      completionEvidence: [],
      safetySignals: [],
      recommendedTransition: "advance",
    }, "en-US", context);

    expect(result.accepted).toBe(true);
    expect(result.finalText).toContain("most important");
  });

  it("keeps the legacy text-only validator compatible without runtime role context", () => {
    const result = validateRuntimeOutput("We can take this one step at a time.", "en-US");

    expect(result.accepted).toBe(true);
  });
});