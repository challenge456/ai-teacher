import { describe, expect, it } from "vitest";
import { MockTeachingProvider } from "@/teaching/mock-provider";
import { lessonToCreateData } from "./session";

const learner = {
  level: "intermediate" as const,
  knownTopics: [],
  objective: "Understand photosynthesis",
  teachingStyle: "direct" as const,
  language: "en",
  availableMinutes: 15,
  preferredDepth: "standard" as const,
};

describe("lesson persistence data", () => {
  it("keeps every generated section and initializes a session", async () => {
    const lesson = await new MockTeachingProvider().generateLesson({
      topic: "Photosynthesis",
      learner,
    });

    const data = lessonToCreateData(lesson);
    const sections = data.sections && "create" in data.sections ? data.sections.create : [];
    expect(sections).toHaveLength(lesson.sections.length);
    expect(data.session).toEqual({ create: {} });
  });
});
