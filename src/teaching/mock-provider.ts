import type {
  GenerateSectionInput,
  GenerateAdaptationInput,
  EvaluateAnswerInput,
  TeachingModelProvider,
} from "./provider";
import {
  AdaptationSchema,
  AnswerEvaluationSchema,
  LessonPlanSchema,
  LessonSectionSchema,
  type Adaptation,
  type AnswerEvaluation,
  type GenerateLessonRequest,
  type LearnerProfile,
  type LessonPlan,
  type LessonQuestion,
  type LessonSection,
  type TeachingStyle,
  type VisualType,
} from "./schemas";

type SectionBlueprint = {
  concept: string;
  visualType: VisualType;
  durationHintSec: number;
  questionKind: LessonQuestion["kind"] | null;
};

const PROGRESSION: SectionBlueprint[] = [
  {
    concept: "What it is",
    visualType: "blackboard",
    durationHintSec: 90,
    questionKind: null,
  },
  {
    concept: "Inputs and outputs",
    visualType: "diagram",
    durationHintSec: 100,
    questionKind: null,
  },
  {
    concept: "How the process works",
    visualType: "steps",
    durationHintSec: 120,
    questionKind: null,
  },
  {
    concept: "A simple example",
    visualType: "example",
    durationHintSec: 90,
    questionKind: null,
  },
  {
    concept: "Check your understanding",
    visualType: "table",
    durationHintSec: 80,
    questionKind: "short-answer",
  },
];

const PHOTOSYNTHESIS_TOPIC = "photosynthesis";

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "topic";
}

function isPhotosynthesis(topic: string): boolean {
  return topic.trim().toLowerCase() === PHOTOSYNTHESIS_TOPIC;
}

function styleLead(style: TeachingStyle, topic: string): string {
  switch (style) {
    case "socratic":
      return `Before we name it, notice what ${topic} has to explain.`;
    case "storytelling":
      return `Imagine watching ${topic} happen in the real world.`;
    case "worked-example":
      return `We will walk through ${topic} the way a teacher works a problem on the board.`;
    case "inquiry":
      return `Start with a question: what would have to be true for ${topic} to work?`;
    case "direct":
    default:
      return `Here is a clear account of ${topic}.`;
  }
}

function depthNote(learner: LearnerProfile): string {
  switch (learner.preferredDepth) {
    case "overview":
      return "Stay with the big idea; skip extra machinery.";
    case "deep":
      return "Include one extra layer of mechanism so the idea holds under questions.";
    case "standard":
    default:
      return "Cover the core idea and one concrete check.";
  }
}

function knownTopicsNote(learner: LearnerProfile): string {
  if (learner.knownTopics.length === 0) {
    return "Assume little prior knowledge.";
  }
  return `Build on what the learner already knows: ${learner.knownTopics.join(", ")}.`;
}

function photosynthesisSection(
  order: number,
  learner: LearnerProfile,
): Omit<LessonSection, "id" | "order" | "language" | "durationHintSec" | "sourceCitations"> {
  const style = styleLead(learner.teachingStyle, "photosynthesis");

  switch (order) {
    case 0:
      return {
        concept: "What photosynthesis is",
        explanation:
          `${style} Photosynthesis is the process plants (and some other organisms) use to turn light energy into chemical energy stored in sugars. At ${learner.level} level: a leaf is a tiny factory that uses sunlight as power. ${depthNote(learner)} ${knownTopicsNote(learner)}`,
        spokenScript:
          "Photosynthesis is how a plant captures sunlight and stores that energy in sugar. Think of a leaf as a quiet factory powered by light.",
        visualType: "blackboard",
        visualContent:
          "Title: Photosynthesis\nLeaf → sunlight in → sugar stored\nOne-line definition: light energy → chemical energy in sugar",
        question: null,
        expectedConcept: "Photosynthesis converts light energy into stored chemical energy (sugar).",
        successCriteria: [
          "Can state that photosynthesis stores light energy as sugar",
          "Names plants (or similar organisms) as the actors",
        ],
      };
    case 1:
      return {
        concept: "Inputs and outputs",
        explanation:
          "The factory needs three inputs: carbon dioxide from air, water from the roots, and light. The two main outputs are sugar (the useful product) and oxygen (released as a by-product). Water and carbon dioxide are raw materials; light is the energy source, not a material that gets 'used up' like a chemical.",
        spokenScript:
          "Three things go in: carbon dioxide, water, and light. Two things come out: sugar, which the plant keeps, and oxygen, which it releases.",
        visualType: "diagram",
        visualContent:
          "CO2 (air) + H2O (roots) + light → sugar + O2\nBox: INPUTS | PROCESS | OUTPUTS",
        question: null,
        expectedConcept: "Inputs are CO2, water, and light; outputs are sugar and oxygen.",
        successCriteria: [
          "Lists CO2, water, and light as inputs",
          "Lists sugar and oxygen as outputs",
        ],
      };
    case 2:
      return {
        concept: "How the process works",
        explanation:
          "Inside chloroplasts, chlorophyll absorbs light. That energy splits water, releasing oxygen, and drives a chain of reactions that fix carbon dioxide into sugar. You do not need the full Calvin cycle yet: remember the sequence — capture light, split water, build sugar.",
        spokenScript:
          "Chlorophyll in the chloroplast catches the light. That energy splits water, oxygen leaves, and carbon from carbon dioxide is built into sugar.",
        visualType: "steps",
        visualContent:
          "1. Chlorophyll absorbs light\n2. Water is split → O2 released\n3. CO2 carbon is fixed into sugar",
        question: null,
        expectedConcept: "Light captured by chlorophyll powers water-splitting and sugar-building.",
        successCriteria: [
          "Mentions chlorophyll or chloroplasts",
          "Orders: capture light → split water / release O2 → build sugar",
        ],
      };
    case 3:
      return {
        concept: "A simple example",
        explanation:
          "A tomato plant on a sunny windowsill takes in carbon dioxide, drinks water through its roots, and uses daylight. By afternoon it has made sugars it can use to grow fruit — and the room has a little extra oxygen. If you cover the plant so no light reaches it, sugar production slows even if water and air are still there. Light is the switch.",
        spokenScript:
          "Picture a tomato plant in a sunny window. Water, air, and light go in. Sugar for the fruit comes out, and so does oxygen. Cover the plant and the sugar-making slows, even with water still there.",
        visualType: "example",
        visualContent:
          "Sunny window: tomato plant\nDay: CO2 + H2O + light → sugar + O2\nCovered plant: same water/air, less light → less sugar",
        question: null,
        expectedConcept: "A plant in light makes sugar; without light the process slows even if water remains.",
        successCriteria: [
          "Connects a real plant to the inputs/outputs",
          "Notes that light is required, not optional decoration",
        ],
      };
    case 4:
    default:
      return {
        concept: "Check your understanding",
        explanation:
          "Pause and retrieve. If you can name the inputs, the useful output, and why light matters, you have the core of photosynthesis — enough to teach it back in one minute.",
        spokenScript:
          "Check yourself: what goes in, what comes out, and what happens if the light goes away?",
        visualType: "table",
        visualContent:
          "Prompt | Expected\nInputs | CO2, water, light\nUseful output | sugar\nBy-product | oxygen\nIf no light | process slows / stops",
        question: {
          prompt:
            "In one or two sentences: what are the inputs of photosynthesis, and what useful product does the plant keep?",
          kind: "short-answer",
        },
        expectedConcept: "CO2, water, and light in; sugar kept (oxygen released).",
        successCriteria: [
          "Names at least two of: CO2, water, light",
          "Names sugar (or glucose / food / chemical energy) as the useful product",
        ],
      };
  }
}

function genericSection(
  topic: string,
  order: number,
  blueprint: SectionBlueprint,
  learner: LearnerProfile,
): Omit<LessonSection, "id" | "order" | "language" | "durationHintSec" | "sourceCitations"> {
  const titled = titleCase(topic);
  const style = styleLead(learner.teachingStyle, titled);

  const explanations = [
    `${style} ${titled} is the idea we will unpack in this lesson. At ${learner.level} level we start with a definition you can reuse, then we will add structure. ${depthNote(learner)} ${knownTopicsNote(learner)}`,
    `${titled} has inputs (what must be present) and outputs (what changes or is produced). Separating those two lists keeps the idea from becoming a blur of facts.`,
    `The process of ${titled} is a sequence, not a pile. We name the steps in order so you can replay them without notes.`,
    `Here is a small, concrete case of ${titled} so the definition is no longer abstract.`,
    `Retrieve the core of ${titled} now, while the example is still in mind. A short answer is enough if it names the idea, not a memorized sentence.`,
  ];

  const spoken = [
    `Today we are learning ${titled}. I will give you a definition you can say back, then we will add the moving parts.`,
    `For ${titled}, first list what goes in and what comes out. That split is the skeleton of the idea.`,
    `Now the sequence for ${titled}. Keep the order; the order is the explanation.`,
    `Let me show a small example of ${titled} so you can see the definition happening.`,
    `Pause. In your own words, what is the core of ${titled}?`,
  ];

  const visuals: Record<number, string> = {
    0: `Title: ${titled}\nOne-line definition on the board\nAudience: ${learner.level}`,
    1: `${titled}\nINPUTS → PROCESS → OUTPUTS\n(fill the two lists with the learner)`,
    2: `${titled} steps:\n1. Set up\n2. Transform\n3. Result`,
    3: `Worked example of ${titled}\nBefore → during → after`,
    4: `Check table for ${titled}\nPrompt | What a solid answer names`,
  };

  const question: LessonQuestion | null =
    blueprint.questionKind === null
      ? null
      : {
          prompt: `In one or two sentences, what is the core idea of ${titled}?`,
          kind: blueprint.questionKind,
        };

  return {
    concept: `${blueprint.concept}: ${titled}`,
    explanation: explanations[order] ?? explanations[0],
    spokenScript: spoken[order] ?? spoken[0],
    visualType: blueprint.visualType,
    visualContent: visuals[order] ?? titled,
    question,
    expectedConcept: `The learner can state the core of ${titled} for this section (${blueprint.concept}).`,
    successCriteria: [
      `Names the focus of this section (${blueprint.concept.toLowerCase()})`,
      "Uses the lesson's terms rather than a vague restatement",
    ],
  };
}

function buildSection(
  topic: string,
  learner: LearnerProfile,
  order: number,
): LessonSection {
  const blueprint = PROGRESSION[order] ?? PROGRESSION[0];
  const body = isPhotosynthesis(topic)
    ? photosynthesisSection(order, learner)
    : genericSection(topic, order, blueprint, learner);

  const durationScale =
    learner.preferredDepth === "deep" ? 1.25 : learner.preferredDepth === "overview" ? 0.85 : 1;

  return LessonSectionSchema.parse({
    id: `${slugify(topic)}-s${order + 1}`,
    order,
    language: learner.language,
    durationHintSec: Math.max(30, Math.round(blueprint.durationHintSec * durationScale)),
    ...body,
  });
}

function minutesFor(learner: LearnerProfile, sectionCount: number): number {
  const raw = Math.min(
    learner.availableMinutes,
    Math.max(8, Math.round((sectionCount * 2.5 * (learner.preferredDepth === "deep" ? 1.2 : 1)))),
  );
  return raw;
}

export class MockTeachingProvider implements TeachingModelProvider {
  readonly id = "mock";

  async generateLesson(input: GenerateLessonRequest): Promise<LessonPlan> {
    const topic = input.topic.trim();
    const learner = input.learner;
    const sections = PROGRESSION.map((_, index) => buildSection(topic, learner, index));
    const concepts = sections.map((section) => section.concept);

    const plan = LessonPlanSchema.parse({
      topic,
      objective: learner.objective,
      estimatedMinutes: minutesFor(learner, sections.length),
      concepts,
      sections,
      learner,
    });

    return plan;
  }

  async generateSection(input: GenerateSectionInput): Promise<LessonSection> {
    return buildSection(input.topic, input.learner, input.order);
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<AnswerEvaluation> {
    const answer = input.answer.trim().toLowerCase();
    const expected = input.section.expectedConcept.toLowerCase();
    const keywords = expected
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3)
      .slice(0, 8);
    const hits = keywords.filter((word) => answer.includes(word)).length;
    const keywordRatio = keywords.length === 0 ? 0 : hits / keywords.length;
    const minLength = 8;

    let verdict: "correct" | "partial" | "incorrect";
    let score: number;
    let feedback: string;
    let misconception: string | undefined;
    let weakConcept: string | undefined;

    if (keywordRatio >= 0.6 && answer.length >= minLength) {
      verdict = "correct";
      score = Math.min(1, 0.7 + keywordRatio * 0.3);
      feedback =
        "Excellent. You have captured the expected concept. We can move on.";
    } else if (keywordRatio >= 0.3 && answer.length >= minLength) {
      verdict = "partial";
      score = keywordRatio;
      feedback =
        "You are on the right track, but let me clarify one more piece.";
      weakConcept = input.section.expectedConcept;
    } else if (answer.length < minLength) {
      verdict = "incorrect";
      score = 0;
      feedback =
        "Your answer is too brief to evaluate. Please give a more complete explanation.";
    } else {
      verdict = "incorrect";
      score = Math.max(0, keywordRatio * 0.5);
      misconception = this.inferMisconception(
        answer,
        input.section.expectedConcept,
      );
      feedback =
        misconception && misconception !== input.section.expectedConcept
          ? `I notice you may be thinking: "${misconception}". Let me clarify.`
          : `I do not think that captures the idea. Let me explain it differently.`;
    }

    return AnswerEvaluationSchema.parse({
      verdict,
      score: Math.round(score * 100) / 100,
      feedback,
      misconception,
      weakConcept,
      reasoning: `Keyword match: ${hits}/${keywords.length}, length: ${answer.length} chars`,
    });
  }

  private inferMisconception(answer: string, expected: string): string {
    const lowerAnswer = answer.toLowerCase();
    if (lowerAnswer.includes("energy")) {
      return "Energy is consumed rather than captured and stored";
    }
    if (lowerAnswer.includes("carbon")) {
      return "Carbon dioxide is a waste product rather than a raw material";
    }
    if (lowerAnswer.includes("oxygen")) {
      return "Oxygen is the main product rather than a by-product";
    }
    return expected;
  }

  async generateAdaptation(input: GenerateAdaptationInput): Promise<Adaptation> {
    if (input.evaluation.verdict === "correct") {
      return AdaptationSchema.parse({
        strategy: "advance",
        explanation: "Your understanding is solid. Let us move to the next idea.",
        spokenScript:
          "You have understood this well. Let us move forward to the next concept.",
        visualType: "blackboard",
        visualContent: "✓ Concept mastered.",
        expectedConcept: input.section.expectedConcept,
        successCriteria: [
          `The learner has correctly expressed: ${input.section.expectedConcept}`,
        ],
        reasoning: "Verdict is correct; no adaptation needed.",
      });
    }

    if (input.evaluation.verdict === "partial") {
      const missing = input.evaluation.weakConcept || input.section.expectedConcept;
      return AdaptationSchema.parse({
        strategy: "alternative-explanation",
        explanation: this.alternativeExplanation(
          input.section.expectedConcept,
          missing,
        ),
        spokenScript: this.alternativeSpoken(
          input.section.expectedConcept,
          missing,
        ),
        visualType: "diagram",
        visualContent: this.alternativeVisual(
          input.section.expectedConcept,
          missing,
        ),
        followUpQuestion: {
          prompt: `So, what happens to the ${missing.split(" ")[0].toLowerCase()}?`,
          kind: "short-answer",
        },
        expectedConcept: missing,
        successCriteria: [
          `Addresses the missing piece: ${missing}`,
          "Shows understanding of the refined concept",
        ],
        reasoning: `Partial match detected. Missing: ${missing}. Attempt ${input.attemptNumber}.`,
      });
    }

    // incorrect
    const misconception = input.evaluation.misconception || input.section.expectedConcept;
    return AdaptationSchema.parse({
      strategy: "reteach-simple",
      explanation: this.remedialExplanation(
        input.section.expectedConcept,
        misconception,
      ),
      spokenScript: this.remedialSpoken(
        input.section.expectedConcept,
        misconception,
      ),
      visualType: "example",
      visualContent: this.remedialVisual(input.section.expectedConcept),
      followUpQuestion: {
        prompt: `Try again. In simpler terms: ${this.simplePrompt(input.section.concept)}`,
        kind: "short-answer",
      },
      expectedConcept: input.section.expectedConcept,
      successCriteria: [
        `Does not repeat the misconception: ${misconception}`,
        `Aligns with: ${input.section.expectedConcept}`,
      ],
      reasoning: `Incorrect verdict. Possible misconception: ${misconception}. Attempt ${input.attemptNumber}.`,
    });
  }

  private alternativeExplanation(expected: string, missing: string): string {
    return `You were close. Here is the part I want to highlight: ${missing}. Think of it this way — the whole process depends on this step.`;
  }

  private alternativeSpoken(expected: string, missing: string): string {
    return `Let me zoom in on one piece you did not mention: ${missing}. That is the crucial detail.`;
  }

  private alternativeVisual(expected: string, missing: string): string {
    return `BEFORE:\n[your understanding]\n\nAFTER:\nAdd this step: ${missing}\n\n[complete picture]`;
  }

  private remedialExplanation(expected: string, misconception: string): string {
    return `I see the mix-up. You said "${misconception}", but here is the simpler version: ${expected}. The key is to focus on one thing at a time.`;
  }

  private remedialSpoken(expected: string, misconception: string): string {
    return `Let me back up. You thought "${misconception}". Actually, it is simpler: ${expected}.`;
  }

  private remedialVisual(expected: string): string {
    return `SIMPLE VERSION:\n${expected}\n\n(Everything else flows from this one idea.)`;
  }

  private simplePrompt(concept: string): string {
    const words = concept.toLowerCase().split(/\s+/);
    const key = (words[words.length - 1] || "idea") as string;
    return `what is the ${key}?`;
  }
}
