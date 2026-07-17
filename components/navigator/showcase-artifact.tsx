"use client";

import {
  Artifact,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { ArrowUpRight, Check, MonitorPlay, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ShowcaseStep {
  tool: string;
  input: string;
  ok: boolean;
}

interface ShowcaseStatus {
  status: "running" | "finished" | "failed";
  steps: ShowcaseStep[];
  result: { summary: string | null; extracted: unknown } | null;
  title: string | null;
}

type Phase = "live" | "replay-loading" | "replay" | "expired";

/**
 * The live-browser demo card: while the demo runs it embeds the Browserbase
 * live view (read-only — an anonymous visitor must not drive a session this
 * app pays for); when the session ends it swaps to the recorded HLS replay.
 * Step log + extract result arrive via the status route (the model's turn is
 * over before the demo finishes, so the card is the outcome's only channel).
 */
export function ShowcaseArtifact({
  sessionId,
  liveViewUrl,
  title,
  sourceUrl,
}: {
  sessionId: string;
  liveViewUrl: string;
  title: string;
  sourceUrl: string;
}) {
  const [phase, setPhase] = useState<Phase>("live");
  const [run, setRun] = useState<ShowcaseStatus | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const replayTriesRef = useRef(0);

  const fetchStatus = useCallback(async (): Promise<ShowcaseStatus | null> => {
    const res = await fetch(`/api/showcase/${sessionId}/status`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      setPhase("expired");
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as ShowcaseStatus;
    setRun(data);
    return data;
  }, [sessionId]);

  // Live phase: poll the step ticker; flip to replay when the run closes.
  useEffect(() => {
    if (phase !== "live") return;
    let cancelled = false;
    const tick = async () => {
      const data = await fetchStatus();
      if (!cancelled && data && data.status !== "running") {
        setPhase("replay-loading");
      }
    };
    void tick();
    const id = setInterval(tick, 3_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, fetchStatus]);

  // The live view posts "browserbase-disconnected" the moment the session
  // ends — faster than the next poll.
  useEffect(() => {
    if (phase !== "live") return;
    const onMessage = (e: MessageEvent) => {
      if (e.data === "browserbase-disconnected") setPhase("replay-loading");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [phase]);

  // Replay phase: fetch the playlist with backoff (processing lag after the
  // session ends), then attach hls.js — Safari plays HLS natively.
  useEffect(() => {
    if (phase !== "replay-loading") return;
    let cancelled = false;

    const attempt = async () => {
      const res = await fetch(`/api/showcase/${sessionId}/replay`);
      if (cancelled) return;
      if (res.status === 202) {
        replayTriesRef.current += 1;
        if (replayTriesRef.current > 6) {
          setPhase("expired");
          return;
        }
        setTimeout(attempt, 2_000 * replayTriesRef.current);
        return;
      }
      if (!res.ok) {
        setPhase("expired");
        return;
      }
      setPhase("replay");
    };
    void attempt();
    void fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [phase, sessionId, fetchStatus]);

  useEffect(() => {
    if (phase !== "replay") return;
    const video = videoRef.current;
    if (!video) return;
    const src = `/api/showcase/${sessionId}/replay`;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }
    let hls: { destroy: () => void } | null = null;
    void (async () => {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        video.src = src;
        return;
      }
      const instance = new Hls();
      instance.loadSource(src);
      instance.attachMedia(video);
      hls = instance;
    })();
    return () => hls?.destroy();
  }, [phase, sessionId]);

  // The finish step's input IS the summary — rendering both reads twice.
  const steps = (run?.steps ?? []).filter((s) => s.tool !== "finish");
  const summary = run?.result?.summary ?? null;

  return (
    <Artifact className="mb-3 border-transparent light:border-border">
      <ArtifactHeader>
        <div className="flex min-w-0 items-center gap-2.5">
          <MonitorPlay aria-hidden className="size-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <span className="eyebrow text-brand-text">
              {phase === "live"
                ? "Live demo"
                : phase === "replay"
                  ? "Demo replay"
                  : phase === "replay-loading"
                    ? "Preparing replay"
                    : "Demo ended"}
            </span>
            <ArtifactTitle className="mt-1 truncate">{title}</ArtifactTitle>
          </div>
        </div>
        <a
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text transition-colors duration-200 ease-brand hover:bg-surface-2"
          href={sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          Playbook
          <ArrowUpRight aria-hidden className="size-3.5" />
        </a>
      </ArtifactHeader>
      <ArtifactContent className="space-y-3">
        {phase === "live" && (
          <div className="relative overflow-hidden rounded-md bg-surface-sunken">
            <iframe
              allow="clipboard-read; clipboard-write"
              className="pointer-events-none aspect-video w-full"
              sandbox="allow-scripts allow-same-origin"
              src={`${liveViewUrl}&navbar=false`}
              title={`Live browser demo: ${title}`}
            />
          </div>
        )}
        {phase === "replay-loading" && (
          <div className="flex aspect-video w-full items-center justify-center rounded-md bg-surface-sunken">
            <span className="eyebrow animate-pulse">Preparing replay…</span>
          </div>
        )}
        {phase === "replay" && (
          <video
            className="aspect-video w-full rounded-md bg-surface-sunken"
            controls
            ref={videoRef}
          />
        )}
        {phase === "expired" && (
          <p className="text-sm text-text-muted">
            This demo's session has expired.{" "}
            <a
              className="font-medium text-brand-text underline"
              href={sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Read the playbook instead.
            </a>
          </p>
        )}

        {steps.length > 0 && (
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li className="flex items-center gap-2 text-xs" key={i}>
                {step.ok ? (
                  <Check aria-hidden className="size-3 shrink-0 text-success" />
                ) : (
                  <X aria-hidden className="size-3 shrink-0 text-error-fg" />
                )}
                <span className="eyebrow shrink-0">{step.tool}</span>
                <span className="min-w-0 truncate font-mono text-text-muted">
                  {step.input}
                </span>
              </li>
            ))}
          </ol>
        )}
        {summary && <p className="text-sm text-text">{summary}</p>}
      </ArtifactContent>
    </Artifact>
  );
}
