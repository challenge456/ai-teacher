import type { AvatarVideoJob } from "@/media/heygen";

type RemoteJob = { id?: string; videoId?: string; status?: string; videoUrl?: string; video_url?: string; error?: string; detail?: string };

function message(value: RemoteJob, fallback: string): string {
  return value.error || value.detail || fallback;
}

function endpoint(): string {
  const url = process.env.LOCAL_AVATAR_API_URL?.replace(/\/$/, "");
  if (!url) throw new Error("No free avatar renderer is configured. Start the MuseTalk Colab companion and add LOCAL_AVATAR_API_URL.");
  return url;
}

function headers(): HeadersInit {
  const token = process.env.LOCAL_AVATAR_API_TOKEN;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function toJob(value: RemoteJob): AvatarVideoJob {
  const status = value.status === "completed" ? "completed" : value.status === "failed" ? "failed" : "processing";
  const videoId = value.videoId ?? value.id ?? "";
  if (!videoId) throw new Error("The local avatar renderer returned an invalid job.");
  const returnedUrl = value.videoUrl ?? value.video_url;
  const videoUrl = returnedUrl ? new URL(returnedUrl, `${endpoint()}/`).toString() : undefined;
  return { videoId, status, videoUrl, error: value.error };
}

/** Calls the user's free MuseTalk/Colab renderer. It deliberately uses a small, provider-neutral API contract. */
export async function createLocalAvatarVideo(input: { script: string; title: string; language: string }): Promise<AvatarVideoJob> {
  const response = await fetch(`${endpoint()}/jobs`, { method: "POST", headers: headers(), body: JSON.stringify(input), cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as RemoteJob;
  if (!response.ok) throw new Error(message(body, "The free avatar renderer could not start this video."));
  return toJob(body);
}

export async function getLocalAvatarVideo(videoId: string): Promise<AvatarVideoJob> {
  const response = await fetch(`${endpoint()}/jobs/${encodeURIComponent(videoId)}`, { headers: headers(), cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as RemoteJob;
  if (!response.ok) throw new Error(message(body, "The free avatar renderer could not check this video."));
  return toJob(body);
}
