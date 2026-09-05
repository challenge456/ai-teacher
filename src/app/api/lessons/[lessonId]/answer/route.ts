import { NextResponse } from "next/server";
import { createTeachingEngine, TeachingEngineError } from "@/teaching";
import { ZodError } from "zod";
import { prisma } from "@/db/client";
import { lessonInclude, toPersistedLesson } from "@/lessons/session";

/**
 * POST /api/lessons/[lessonId]/answer
 *
 * Submits a student answer to a section question.
 * Returns evaluation + adaptation + progress + next action.
 *
 * Loads the lesson and progress from PostgreSQL; the client never sends the
 * lesson plan back to the server.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  try {
    const { lessonId } = await params;
    const body = await request.json();

    const stored = await prisma.lesson.findUnique({ where: { id: lessonId }, include: lessonInclude });
    if (!stored) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 },
      );
    }
    const persisted = toPersistedLesson(stored);
    const session = stored.session;
    if (!session) throw new Error("Lesson session is missing");

    const currentSection = persisted.lesson.sections[session.currentSection];
    if (!currentSection || currentSection.id !== body.sectionId) {
      return NextResponse.json({ error: "This section is not ready for an answer" }, { status: 409 });
    }

    const engine = createTeachingEngine("auto");
    const answerRequest = {
      lessonId,
      sectionId: body.sectionId,
      answer: body.answer,
      attemptNumber: session.currentAttempt,
    };

    const response = await engine.evaluateAnswerAndAdapt(answerRequest, persisted.lesson);
    const sectionRecord = stored.sections.find((section) => section.sourceId === body.sectionId);
    if (!sectionRecord) throw new Error("Lesson section is missing");

    await prisma.$transaction([
      prisma.studentAnswer.create({
        data: {
          sessionId: session.id,
          sectionId: sectionRecord.id,
          answer: answerRequest.answer,
          attemptNumber: session.currentAttempt,
          evaluation: response.evaluation,
          adaptation: response.adaptation ?? undefined,
          nextAction: response.nextAction,
          message: response.message,
        },
      }),
      prisma.lessonSession.update({
        where: { id: session.id },
        data: {
          state: "adaptation",
        },
      }),
    ]);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof TeachingEngineError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("Unexpected error in POST /api/lessons/[lessonId]/answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
