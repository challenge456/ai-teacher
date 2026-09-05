import { describe, expect, it } from "vitest";
import { createLearningReport } from "./report";

describe("learning report", () => {
  it("uses the latest result per concept and highlights revision needs", () => {
    const report = createLearningReport("Photosynthesis", [
      { section: { concept: "Inputs", expectedConcept: "CO2 and water" }, evaluation: { verdict: "incorrect", score: 0.2, misconception: "Mixed up inputs and outputs" } },
      { section: { concept: "Inputs", expectedConcept: "CO2 and water" }, evaluation: { verdict: "correct", score: 1 } },
      { section: { concept: "Light", expectedConcept: "Light provides energy" }, evaluation: { verdict: "partial", score: 0.4 } },
    ]);
    expect(report.scorePercent).toBe(70);
    expect(report.strongConcepts).toEqual(["Inputs"]);
    expect(report.needsRevision[0].concept).toBe("Light");
    expect(report.suggestedNextTopic).toBe("Revision: Light");
  });
});
