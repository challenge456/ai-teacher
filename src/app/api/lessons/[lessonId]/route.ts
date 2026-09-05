import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { lessonInclude, toPersistedLesson } from "@/lessons/session";

const SessionStateSchema = z.enum(["lesson-overview", "teaching", "question", "adaptation", "complete"]);
const SessionUpdateSchema = z.object({
  state: SessionStateSchema,
  continueFromAnswer: z.boolean().optional(),
  currentSection: z.number().int().nonnegative().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: lessonInclude });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  return NextResponse.json(toPersistedLesson(lesson));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  try {
    const { lessonId } = await params;
    const { state, continueFromAnswer, currentSection } = SessionUpdateSchema.parse(await request.json());
    const existing = await prisma.lesson.findUnique({ where: { id: lessonId }, include: lessonInclude });
    if (!existing?.session) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    const lastAnswer = existing.session.answers[0];
    if (currentSection !== undefined && currentSection >= existing.sections.length) {
      return NextResponse.json({ error: "Section is outside this lesson" }, { status: 400 });
    }
    const advancing = currentSection !== undefined || (continueFromAnswer && lastAnswer?.nextAction === "advance");
    const retrying = continueFromAnswer && lastAnswer?.nextAction === "retry";
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        session: {
          update: {
            state,
            currentSection: currentSection ?? (advancing ? existing.session.currentSection + 1 : undefined),
            currentAttempt: retrying ? existing.session.currentAttempt + 1 : advancing ? 1 : undefined,
            completedAt: continueFromAnswer && lastAnswer?.nextAction === "complete" ? new Date() : undefined,
          },
        },
      },
      include: lessonInclude,
    });
    return NextResponse.json(toPersistedLesson(lesson));
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Validation error", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
}
