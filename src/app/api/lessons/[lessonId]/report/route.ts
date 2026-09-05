import { NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { createLearningReport } from "@/lessons/report";

/** Returns a completion report based on saved answer evaluations for this lesson. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      sections: { select: { id: true, concept: true, expectedConcept: true } },
      session: { include: { answers: { include: { section: { select: { concept: true, expectedConcept: true } } }, orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!lesson?.session) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  const answers = lesson.session.answers.map((answer) => ({ section: answer.section, evaluation: answer.evaluation as { verdict: "correct" | "partial" | "incorrect"; score: number; misconception?: string; weakConcept?: string } }));
  const report = createLearningReport(lesson.topic, answers);
  if (lesson.studentId) {
    const latestByConcept = new Map<string, (typeof answers)[number]>();
    for (const answer of answers) latestByConcept.set(answer.section.concept, answer);
    await Promise.all([...latestByConcept.values()].map(async (answer) => {
      const existing = await prisma.conceptProgress.findUnique({ where: { studentId_topic_concept: { studentId: lesson.studentId!, topic: lesson.topic, concept: answer.section.concept } } });
      const attempts = (existing?.attempts ?? 0) + 1;
      const correctAttempts = (existing?.correctAttempts ?? 0) + (answer.evaluation.verdict === "correct" ? 1 : 0);
      const mastery = Math.round((((existing?.mastery ?? answer.evaluation.score) * (attempts - 1) + answer.evaluation.score) / attempts) * 100) / 100;
      await prisma.conceptProgress.upsert({
        where: { studentId_topic_concept: { studentId: lesson.studentId!, topic: lesson.topic, concept: answer.section.concept } },
        create: { studentId: lesson.studentId!, topic: lesson.topic, concept: answer.section.concept, mastery, attempts, correctAttempts },
        update: { mastery, attempts, correctAttempts, lastStudiedAt: new Date() },
      });
    }));
  }
  return NextResponse.json(report);
}
