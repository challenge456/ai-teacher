import { NextResponse } from "next/server";
import { z } from "zod";
import { createHeyGenTeachingVideo, getHeyGenTeachingVideo } from "@/media/heygen";
import { createLocalAvatarVideo, getLocalAvatarVideo } from "@/media/local-avatar";

const CreateSchema = z.object({ script: z.string().min(10).max(1800), title: z.string().min(1).max(100), language: z.string().min(2).max(12) });
const StatusSchema = z.object({ videoId: z.string().min(1) });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = CreateSchema.parse(await request.json());
    const job = process.env.LOCAL_AVATAR_API_URL
      ? await createLocalAvatarVideo(body)
      : await createHeyGenTeachingVideo(body);
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate the teacher video." }, { status: 400 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const videoId = StatusSchema.parse({ videoId: new URL(request.url).searchParams.get("videoId") }).videoId;
    const job = process.env.LOCAL_AVATAR_API_URL
      ? await getLocalAvatarVideo(videoId)
      : await getHeyGenTeachingVideo(videoId);
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to check the teacher video." }, { status: 400 });
  }
}
