import { describe, expect, it } from "vitest";
import { TeachingEngine, TeachingEngineError } from "./engine";
import { MockTeachingProvider } from "./mock-provider";
import { createTeachingEngine } from "./factory";
import {
  LessonPlanSchema,
  LearnerProfileSchema,
  AnswerVerdictSchema,
} from "./schemas";

const validLearner = {
  level: "intermediate" as const,
  knownTopics: ["cells"],
  objective: "Understand photosynthesis",
  teachingStyle: "direct" as const,
  language: "en",
  availableMinutes: 15,
  preferredDepth: "standard" as const,
};

describe("LearnerProfileSchema", () => {
  it("accepts a valid profile", () => {
    const result = LearnerProfileSchema.safeParse(validLearner);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid language tag", () => {
    const result = LearnerProfileSchema.safeParse({
      ...validLearner,
      language: "english",
    });
    expect(result.success).toBe(false);
  });

  it("rejects availableMinutes below 5", () => {
    const result = LearnerProfileSchema.safeParse({
      ...validLearner,
      availableMinutes: 2,
    });
    expect(result.success).toBe(false);
  });
});

describe("MockTeachingProvider", () => {
  const provider = new MockTeachingProvider();

  it("generates a 5-section photosynthesis lesson", async () => {
    const plan = await provider.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });

    expect(plan.topic).toBe("Photosynthesis");
    expect(plan.sections).toHaveLength(5);
    expect(plan.sections[0].concept).toMatch(/photosynthesis/i);
    expect(plan.sections[4].question).not.toBeNull();
    expect(LessonPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("is deterministic for the same input", async () => {
    const input = { topic: "Photosynthesis", learner: validLearner };
    const a = await provider.generateLesson(input);
    const b = await provider.generateLesson(input);
    expect(a).toEqual(b);
  });

  it("generates a structured lesson for an unknown topic", async () => {
    const plan = await provider.generateLesson({
      topic: "Fractions",
      learner: validLearner,
    });
    expect(plan.sections).toHaveLength(5);
    expect(plan.sections.every((s: typeof plan.sections[0]) => s.spokenScript.length > 0)).toBe(
      true,
    );
    expect(plan.sections.every((s: typeof plan.sections[0]) => s.visualType)).toBeTruthy();
  });

  it("evaluates a correct answer", async () => {
    const plan = await provider.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });
    const section = plan.sections[0];

    const evaluation = await provider.evaluateAnswer({
      section,
      learner: validLearner,
      answer: "Photosynthesis converts light energy into chemical energy stored in sugar",
      attemptNumber: 1,
    });

    expect(evaluation.verdict).toBe("correct");
    expect(evaluation.score).toBeGreaterThanOrEqual(0.6);
    expect(evaluation.feedback).toContain("Excellent");
  });

  it("evaluates a partial answer", async () => {
    const plan = await provider.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });
    const section = plan.sections[0];

    const evaluation = await provider.evaluateAnswer({
      section,
      learner: validLearner,
      answer: "It uses light and energy to make sugar",
      attemptNumber: 1,
    });

    expect(evaluation.verdict).toBe("partial");
    expect(evaluation.score).toBeGreaterThan(0.3);
    expect(evaluation.score).toBeLessThan(0.6);
  });

  it("evaluates an incorrect answer", async () => {
    const plan = await provider.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });
    const section = plan.sections[0];

    const evaluation = await provider.evaluateAnswer({
      section,
      learner: validLearner,
      answer: "plants use oxygen to make energy",
      attemptNumber: 1,
    });

    expect(evaluation.verdict).toBe("incorrect");
    expect(evaluation.score).toBeLessThan(0.3);
  });

  it("generates an adaptation for a partial answer", async () => {
    const plan = await provider.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });
    const section = plan.sections[0];

    const evaluation = await provider.evaluateAnswer({
      section,
      learner: validLearner,
      // This answer includes "light" and "energy" and "sugar" — enough for partial
      answer: "Light energy is used to make sugar and oxygen in plants",
      attemptNumber: 1,
    });

    expect(evaluation.verdict).toBe("partial");

    const adaptation = await provider.generateAdaptation({
      lesson: plan,
      section,
      evaluation,
      learner: validLearner,
      attemptNumber: 1,
    });

    expect(adaptation.strategy).toBe("alternative-explanation");
    expect(adaptation.explanation.length).toBeGreaterThan(0);
    expect(adaptation.followUpQuestion).not.toBeUndefined();
  });

  it("generates a reteach adaptation for an incorrect answer", async () => {
    const plan = await provider.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });
    const section = plan.sections[0];

    const evaluation = await provider.evaluateAnswer({
      section,
      learner: validLearner,
      answer: "something completely different",
      attemptNumber: 1,
    });

    const adaptation = await provider.generateAdaptation({
      lesson: plan,
      section,
      evaluation,
      learner: validLearner,
      attemptNumber: 1,
    });

    expect(adaptation.strategy).toBe("reteach-simple");
    expect(adaptation.explanation.length).toBeGreaterThan(0);
    expect(adaptation.followUpQuestion).not.toBeUndefined();
  });

  it("advances on a correct answer", async () => {
    const plan = await provider.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });
    const section = plan.sections[0];

    const evaluation = await provider.evaluateAnswer({
      section,
      learner: validLearner,
      answer: "Photosynthesis converts light energy into chemical energy",
      attemptNumber: 1,
    });

    const adaptation = await provider.generateAdaptation({
      lesson: plan,
      section,
      evaluation,
      learner: validLearner,
      attemptNumber: 1,
    });

    expect(adaptation.strategy).toBe("advance");
  });
});

describe("TeachingEngine", () => {
  const engine = new TeachingEngine(new MockTeachingProvider());

  it("returns a validated lesson plan", async () => {
    const plan = await engine.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });
    expect(plan.sections.length).toBeGreaterThan(0);
    expect(plan.estimatedMinutes).toBeGreaterThan(0);
  });

  it("throws TeachingEngineError on invalid input", async () => {
    await expect(engine.generateLesson({ topic: "" })).rejects.toBeInstanceOf(
      TeachingEngineError,
    );
  });

  it("throws on max attempts exceeded", async () => {
    const plan = await engine.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });

    await expect(
      engine.evaluateAnswerAndAdapt(
        {
          lessonId: "test",
          sectionId: plan.sections[0].id,
          answer: "test",
          attemptNumber: 4,
        },
        plan,
      ),
    ).rejects.toBeInstanceOf(TeachingEngineError);
  });

  it("returns 'advance' on correct answer", async () => {
    const plan = await engine.generateLesson({
      topic: "Photosynthesis",
      learner: validLearner,
    });

    // Note: Phase 3 integration test requires learner profile in session
    // This is a placeholder for future database-backed state
    expect(plan).toBeDefined();
  });
});

describe("createTeachingEngine factory", () => {
  it("returns an engine that uses the mock provider", async () => {
    const engine = createTeachingEngine("mock");
    const plan = await engine.generateLesson({
      topic: "Gravity",
      learner: validLearner,
    });
    expect(plan.topic).toBe("Gravity");
  });
});

describe("AnswerVerdict", () => {
  it("accepts all valid verdicts", () => {
    const verdicts = ["correct", "partial", "incorrect"];
    verdicts.forEach((v) => {
      const result = AnswerVerdictSchema.safeParse(v);
      expect(result.success).toBe(true);
    });
  });
});
