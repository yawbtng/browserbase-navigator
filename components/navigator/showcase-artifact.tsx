"use client";

import {
  Artifact,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  MonitorPlay,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ShowcaseStep {
  tool: string;
  input: string;
  ok: boolean;
}

interface Extraction {
  instruction: string;
  data: unknown;
}

interface ShowcaseStatus {
  status: "running" | "finished" | "failed";
  steps: ShowcaseStep[];
  result: {
    summary: string | null;
    extracted: unknown;
    extractions?: Extraction[];
  } | null;
  title: string | null;
}

type Phase = "live" | "replay-loading" | "replay" | "expired";
type Mp4 = "idle" | "preparing" | "ready" | "unavailable";

/**
 * The live-browser demo card: while the demo runs it embeds the Browserbase
 * live view (read-only — an anonymous visitor must not drive a session this
 * app pays for); when the session ends it swaps to the recorded HLS replay,
 * offers the MP4 download, and renders whatever the demo extracted.
 * Step log + result arrive via the status route (the model's turn is over
 * before the demo finishes, so the card is the outcome's only channel).
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
  const [mp4, setMp4] = useState<Mp4>("idle");
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveRef = useRef<HTMLAnchorElement>(null);
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

  /**
   * MP4 assembly is asynchronous on Browserbase's side: the first GET
   * enqueues it, later GETs report progress and mint the signed URL. Poll
   * until it lands, then surface a real anchor — a programmatic click on a
   * cross-origin URL minutes after the user's gesture is exactly what popup
   * blockers eat, so the visible "Save MP4" link is the reliable path.
   */
  const prepareMp4 = useCallback(async () => {
    if (mp4 !== "idle") return;
    setMp4("preparing");
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`/api/showcase/${sessionId}/download`, {
        cache: "no-store",
      });
      if (!res.ok) break;
      const data = (await res.json()) as { status: Mp4 | "pending"; url?: string };
      if (data.status === "ready" && data.url) {
        setMp4Url(data.url);
        setMp4("ready");
        // Best-effort auto-save; the link stays visible either way.
        requestAnimationFrame(() => saveRef.current?.click());
        return;
      }
      if (data.status === "unavailable") break;
      await new Promise((r) => setTimeout(r, 3_000));
    }
    setMp4("unavailable");
  }, [mp4, sessionId]);

  // The finish step's input IS the summary — rendering both reads twice.
  const steps = (run?.steps ?? []).filter((s) => s.tool !== "finish");
  const summary = run?.result?.summary ?? null;
  // `extractions` is the current shape; fall back to the single `extracted`
  // field for runs recorded before the demo captured every extract.
  const extractions: Extraction[] =
    run?.result?.extractions && run.result.extractions.length > 0
      ? run.result.extractions
      : run?.result?.extracted
        ? [{ instruction: "Extracted data", data: run.result.extracted }]
        : [];
  const showDownload = phase === "replay" || phase === "replay-loading";

  return (
    <Artifact className="animate-blur-scale-in mb-3 border-transparent light:border-border">
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
        <div className="flex shrink-0 items-center gap-1">
          {showDownload &&
            (mp4 === "ready" && mp4Url ? (
              <a
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-text transition-colors duration-200 ease-brand hover:bg-surface-2"
                href={mp4Url}
                ref={saveRef}
              >
                <Download aria-hidden className="size-3.5" />
                Save MP4
              </a>
            ) : (
              <button
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text transition-colors duration-200 ease-brand hover:bg-surface-2 disabled:opacity-60"
                disabled={mp4 !== "idle"}
                onClick={prepareMp4}
                type="button"
              >
                <Download aria-hidden className="size-3.5" />
                {mp4 === "preparing"
                  ? "Preparing…"
                  : mp4 === "unavailable"
                    ? "No MP4"
                    : "MP4"}
              </button>
            ))}
          <a
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text transition-colors duration-200 ease-brand hover:bg-surface-2"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Playbook
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        </div>
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
            This demo&apos;s session has expired.{" "}
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
        {extractions.map((extraction, i) => (
          <ExtractionBlock
            extraction={extraction}
            key={i}
            name={`${slug(title)}-${i + 1}.json`}
          />
        ))}
      </ArtifactContent>
    </Artifact>
  );
}

/**
 * The demo's actual payload. A browse.sh skill's whole point is the JSON it
 * returns, so the card shows it verbatim — copyable and downloadable, not
 * paraphrased into prose the model never saw.
 */
function ExtractionBlock({
  extraction,
  name,
}: {
  extraction: Extraction;
  name: string;
}) {
  const [copied, setCopied] = useState(false);
  const data = unwrap(extraction.data);
  const isProse = typeof data === "string";
  const json = isProse ? data : JSON.stringify(data, null, 2);
  const records = Array.isArray(data)
    ? data.length
    : data && typeof data === "object"
      ? Object.keys(data as object).length
      : null;

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <figure className="animate-rise-fade overflow-hidden rounded-md border border-border">
      <figcaption className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <span className="eyebrow shrink-0 text-brand-text">Extracted</span>
        <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
          {extraction.instruction}
        </span>
        {records !== null && (
          <span className="eyebrow shrink-0">
            {records} {Array.isArray(data) ? "records" : "fields"}
          </span>
        )}
        <button
          aria-label="Copy JSON"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0 rounded p-1 text-text-muted transition-colors duration-200 ease-brand hover:bg-surface hover:text-text"
          onClick={copy}
          type="button"
        >
          {copied ? (
            <Check aria-hidden className="size-3.5 text-success" />
          ) : (
            <Copy aria-hidden className="size-3.5" />
          )}
        </button>
        <button
          aria-label="Download JSON"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0 rounded p-1 text-text-muted transition-colors duration-200 ease-brand hover:bg-surface hover:text-text"
          onClick={download}
          type="button"
        >
          <Download aria-hidden className="size-3.5" />
        </button>
      </figcaption>
      {isProse ? (
        <p className="bg-surface-sunken p-3 text-sm text-text">{json}</p>
      ) : (
        <pre className="max-h-72 overflow-auto bg-surface-sunken p-3 text-xs leading-relaxed">
          <code className="font-mono text-text">{json}</code>
        </pre>
      )}
    </figure>
  );
}

/**
 * Stagehand's string-form extract() returns `{ extraction, cacheStatus }`
 * where `extraction` is the payload SERIALIZED AS A STRING — rendering it
 * raw shows escaped quotes instead of records. Unwrap to the real value
 * (parsed when it's JSON, kept as prose when it isn't) and drop the
 * transport envelope. Applied at render, not capture, so the stored row
 * stays byte-faithful to what Stagehand returned.
 */
function unwrap(data: unknown): unknown {
  if (!data || typeof data !== "object" || !("extraction" in data)) return data;
  const inner = (data as { extraction: unknown }).extraction;
  if (typeof inner !== "string") return inner ?? data;
  try {
    return JSON.parse(inner);
  } catch {
    return inner;
  }
}

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "demo"
  );
}
