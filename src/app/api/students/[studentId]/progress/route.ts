import { NextResponse } from "next/server";
import { prisma } from "@/db/client";

/** Returns the anonymous browser learner's saved concept mastery. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
): Promise<NextResponse> {
  const { studentId } = await params;
  const progress = await prisma.conceptProgress.findMany({
    where: { studentId },
    orderBy: { lastStudiedAt: "desc" },
    take: 12,
    select: { topic: true, concept: true, mastery: true, attempts: true, lastStudiedAt: true },
  });
  return NextResponse.json({ progress });
}
