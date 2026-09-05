export type AvatarVideoJob = {
  videoId: string;
  status: "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
};

type HeyGenResponse = {
  error?: { message?: string } | string;
  data?: { video_id?: string; video_status?: string; video_url?: string; status?: string; error?: { message?: string } | string };
};

const HEYGEN_API = "https://api.heygen.com";

function apiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY is not configured on the server.");
  return key;
}

function messageFrom(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") return value.message;
  return undefined;
}

function asJob(data: NonNullable<HeyGenResponse["data"]>): AvatarVideoJob {
  const status = data.status ?? data.video_status ?? "processing";
  const error = messageFrom(data.error);
  return {
    videoId: data.video_id ?? "",
    status: status === "completed" || status === "success" ? "completed" : status === "failed" || error ? "failed" : "processing",
    videoUrl: data.video_url,
    error,
  };
}

/** Creates a rendered, lip-synced teaching clip. The browser never receives the API key. */
export async function createHeyGenTeachingVideo(input: { script: string; title: string; language: string }): Promise<AvatarVideoJob> {
  const response = await fetch(`${HEYGEN_API}/v2/video/generate`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      video_inputs: [{
        character: { type: "avatar", avatar_id: process.env.HEYGEN_AVATAR_ID || "Anna_public_3_20240108", avatar_style: "normal" },
        voice: {
          type: "text",
          input_text: input.script.slice(0, 1800),
          voice_id: process.env.HEYGEN_VOICE_ID || "1bd001e7e50f421d891986aad5158bc8",
        },
      }],
      dimension: { width: 1280, height: 720 },
      title: `AI Teacher: ${input.title}`.slice(0, 100),
      caption: true,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as HeyGenResponse;
  if (!response.ok) throw new Error(messageFrom(payload.error) ?? "HeyGen could not start the teacher video.");
  const job = payload.data ? asJob(payload.data) : undefined;
  if (!job?.videoId) throw new Error("HeyGen did not return a video id.");
  return job;
}

/** Looks up a generated video; HeyGen renders asynchronously. */
export async function getHeyGenTeachingVideo(videoId: string): Promise<AvatarVideoJob> {
  const response = await fetch(`${HEYGEN_API}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
    headers: { "X-Api-Key": apiKey() },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as HeyGenResponse;
  if (!response.ok) throw new Error(messageFrom(payload.error) ?? "HeyGen could not check this teacher video.");
  const job = payload.data ? asJob(payload.data) : undefined;
  if (!job?.videoId) throw new Error("HeyGen returned an invalid video status.");
  return job;
}
