"use client";

import { useEffect, useState } from "react";

type TeacherPresenterProps = {
  script: string;
  language: string;
  concept: string;
};

/** Browser-native voice plus an animated teacher presenter. Provider-backed TTS can replace speak() later. */
export function TeacherPresenter({ script, language, concept }: TeacherPresenterProps) {
  const [speaking, setSpeaking] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<"idle" | "creating" | "processing" | "failed">("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = language;
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  async function generateVideo() {
    setVideoState("creating"); setVideoError(null); setVideoUrl(null);
    try {
      const response = await fetch("/api/avatar-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script, title: concept, language }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start the avatar video.");
      setVideoId(data.videoId);
      if (data.status === "completed" && data.videoUrl) { setVideoUrl(data.videoUrl); setVideoState("idle"); } else setVideoState("processing");
    } catch (error) { setVideoState("failed"); setVideoError(error instanceof Error ? error.message : "Could not start the avatar video."); }
  }

  useEffect(() => {
    if (!videoId || videoState !== "processing") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/avatar-video?videoId=${encodeURIComponent(videoId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not check the avatar video.");
        if (data.status === "completed" && data.videoUrl) { window.clearInterval(timer); setVideoUrl(data.videoUrl); setVideoState("idle"); }
        else if (data.status === "failed") { window.clearInterval(timer); setVideoState("failed"); setVideoError(data.error || "Avatar video generation failed."); }
      } catch (error) { window.clearInterval(timer); setVideoState("failed"); setVideoError(error instanceof Error ? error.message : "Could not check the avatar video."); }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [videoId, videoState]);

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:border-indigo-900 dark:from-indigo-950 dark:via-zinc-900 dark:to-cyan-950">
      <div className="grid gap-4 p-5 sm:grid-cols-[150px_1fr] sm:items-center">
        <div className="relative mx-auto h-32 w-28">
          <div className={`absolute inset-x-4 top-1 h-20 rounded-[45%] bg-amber-200 ${speaking ? "animate-pulse" : ""}`} />
          <div className="absolute left-7 top-9 h-2 w-2 rounded-full bg-zinc-800" />
          <div className="absolute right-7 top-9 h-2 w-2 rounded-full bg-zinc-800" />
          <div className={`absolute left-10 top-15 h-2 w-8 rounded-full bg-rose-500 ${speaking ? "animate-pulse" : ""}`} />
          <div className="absolute inset-x-1 bottom-0 h-16 rounded-t-[45%] bg-indigo-600" />
          {speaking && <span className="absolute -right-4 top-10 text-2xl" aria-label="Teacher speaking">💬</span>}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">AI Teacher · {language}</p>
          <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">Let’s learn: {concept}</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">{script}</p>
          {videoUrl && <video className="mt-4 aspect-video w-full rounded-lg border border-indigo-200 bg-black" controls autoPlay playsInline src={videoUrl}>Your browser cannot play this teaching video.</video>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={speak} disabled={!supported || speaking} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400">
              {speaking ? "Speaking…" : supported ? "▶ Hear teacher" : "Voice unavailable"}
            </button>
            {speaking && <button onClick={stop} className="rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-700 dark:text-indigo-300">Stop</button>}
            <button onClick={() => void generateVideo()} disabled={videoState === "creating" || videoState === "processing"} className="rounded-md bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400">
              {videoState === "creating" ? "Starting avatar…" : videoState === "processing" ? "Rendering avatar…" : videoUrl ? "Regenerate lip-sync video" : "Generate lip-sync teacher video"}
            </button>
          </div>
          {videoState === "processing" && <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-300">Your teacher is rendering. This card will update automatically.</p>}
          {videoError && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{videoError}</p>}
        </div>
      </div>
    </section>
  );
}
