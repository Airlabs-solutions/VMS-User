"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { DriverShell } from "../../components/DriverShell";
import { ApiError, api } from "../../lib/api";

type Message = {
  id: string;
  senderRole: "admin" | "driver";
  body: string;
  fileIds?: string[];
  createdAt: string | null;
};

type FileMeta = { url: string; mime?: string; name?: string };

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dayLabel(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const label = format.format(date);
  if (label === format.format(new Date())) return "Today";
  return label;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function VoiceNote({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const probing = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  function rememberLength(node: HTMLAudioElement) {
    if (Number.isFinite(node.duration) && node.duration > 0) {
      setDuration(node.duration);
      return;
    }
    probing.current = true;
    const onTick = () => {
      node.removeEventListener("timeupdate", onTick);
      const length = node.duration;
      probing.current = false;
      node.currentTime = 0;
      setTime(0);
      if (Number.isFinite(length) && length > 0) setDuration(length);
    };
    node.addEventListener("timeupdate", onTick);
    try {
      node.currentTime = 1e101;
    } catch {
      probing.current = false;
      node.removeEventListener("timeupdate", onTick);
    }
  }

  function toggle() {
    const node = audioRef.current;
    if (!node) return;
    if (node.paused) void node.play().catch(() => setFailed(true));
    else node.pause();
  }

  if (failed) {
    return (
      <a href={src} className="text-sm font-medium text-brand-deep">
        Voice note
      </a>
    );
  }

  const shown = playing || time > 0 ? time : duration;

  return (
    <div className="flex w-[min(100%,17rem)] items-center gap-2.5 rounded-md bg-canvas px-2.5 py-2">
      <button
        type="button"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand text-ink"
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        onClick={toggle}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink">Voice note</p>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={0.1}
          value={duration > 0 ? Math.min(time, duration) : 0}
          aria-label="Voice note position"
          className="mt-1.5 block h-1.5 w-full cursor-pointer accent-[#111610]"
          onChange={(event) => {
            const node = audioRef.current;
            const next = Number(event.target.value);
            if (!node || !Number.isFinite(next)) return;
            node.currentTime = next;
            setTime(next);
          }}
        />
        <p className="mt-1 text-[11px] font-medium tabular-nums text-muted">{formatClock(shown)}</p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        className="hidden"
        onLoadedMetadata={(event) => rememberLength(event.currentTarget)}
        onDurationChange={(event) => {
          const length = event.currentTarget.duration;
          if (Number.isFinite(length) && length > 0) setDuration(length);
        }}
        onTimeUpdate={(event) => {
          if (!probing.current) setTime(event.currentTarget.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (probing.current) return;
          setPlaying(false);
          setTime(0);
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ChatFile({ fileId }: { fileId: string }) {
  const [file, setFile] = useState<FileMeta | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ data: FileMeta }>(`/me/messages/files/${fileId}/url`)
      .then((result) => {
        if (active) setFile(result.data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [fileId]);

  if (failed) return <span className="text-xs text-muted">File unavailable</span>;
  if (!file?.url) return <span className="text-xs text-muted">Loading file...</span>;
  const audio = file.mime?.startsWith("audio/") || /\.(webm|ogg|mp3|m4a|wav|aac)$/i.test(file.name ?? "");
  const image = file.mime?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name ?? "");
  if (audio) return <VoiceNote src={file.url} />;
  if (image) {
    return (
      <a href={file.url} target="_blank" rel="noreferrer">
        <img src={file.url} alt={file.name || "Photo"} className="max-h-52 rounded-md object-cover" />
      </a>
    );
  }
  return (
    <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-deep">
      {file.name || "Open file"}
    </a>
  );
}

export default function MessagesPage() {
  const threadRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [folder, setFolder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    function load(silent: boolean) {
      api<{ data: Message[] }>("/me/messages")
        .then((result) => {
          if (active) setMessages(result.data);
        })
        .catch((err: unknown) => {
          if (active && !silent) setError(err instanceof ApiError ? err.message : "Could not load messages");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    load(false);
    const timer = window.setInterval(() => load(true), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const node = threadRef.current;
    if (!node || folder) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, folder, files.length]);

  useEffect(() => {
    return () => {
      const rec = recorder.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = [...files];
    for (const raw of Array.from(list)) {
      const file = raw.type === "image/jpeg" && !/\.jpe?g$/i.test(raw.name)
        ? new File([raw], `photo-${Date.now()}.jpg`, { type: raw.type })
        : raw.type === "image/png" && !/\.png$/i.test(raw.name)
          ? new File([raw], `photo-${Date.now()}.png`, { type: raw.type })
          : raw;
      if (file.size > 10 * 1024 * 1024) {
        setError("Each file must be 10 MB or smaller.");
        continue;
      }
      if (!/\.(jpe?g|png|pdf|webm|ogg|mp3|m4a|wav|aac)$/i.test(file.name)) {
        setError("Use a JPG, PNG, PDF, or a voice note.");
        continue;
      }
      if (next.length >= 12) {
        setError("You can attach up to 12 files.");
        break;
      }
      next.push(file);
      setError("");
    }
    setFiles(next);
  }

  async function toggleRecording() {
    if (recorder.current && recorder.current.state === "recording") {
      recorder.current.stop();
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const rec = new MediaRecorder(media);
      chunks.current = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      rec.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        stream.current = null;
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        const extension = type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type });
        setFiles((current) => [...current, file].slice(0, 12));
        setRecording(false);
        recorder.current = null;
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      setError("");
    } catch {
      setError("Allow microphone access to record a voice note.");
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (pending || recording) return;
    if (!body && files.length === 0) {
      setError("Write a message or add a file.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const fileIds = await Promise.all(files.map(async (file) => {
        const form = new FormData();
        form.append("file", file);
        const uploaded = await api<{ data: { id: string } }>("/me/messages/files", { method: "POST", form });
        return uploaded.data.id;
      }));
      const result = await api<{ data: Message }>("/me/messages", { method: "POST", body: { body, fileIds } });
      setMessages((current) => [...current, result.data]);
      setDraft("");
      setFiles([]);
      setFolder(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the message");
    } finally {
      setPending(false);
    }
  }

  const shared = messages.flatMap((message) => (message.fileIds ?? []).map((fileId) => ({ fileId, message })));

  let lastDay = "";

  return (
    <DriverShell bleed>
      <div className="flex h-full min-h-0 flex-col bg-card">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-sm font-semibold text-ink">FO</span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-ink">Fleet office</h1>
            <p className="truncate text-xs text-muted">Messages about your vehicle</p>
          </div>
          <button type="button" className={`inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium ${folder ? "bg-brand text-ink" : "text-ink hover:bg-brand-soft"}`} onClick={() => setFolder((open) => !open)}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M3.5 7.5h6l2 2h9v9.5h-17z" strokeLinejoin="round" />
            </svg>
            Files
          </button>
        </header>

        {folder ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-brand-soft px-3 py-4 sm:px-5">
            {shared.length === 0 ? <p className="rounded-lg border border-dashed border-line bg-card px-4 py-10 text-center text-sm text-muted">No photos, voice notes, or files in this chat yet.</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {shared.map(({ fileId, message }) => (
                <div key={`${message.id}-${fileId}`} className="space-y-2 rounded-lg border border-line bg-card p-3">
                  <ChatFile fileId={fileId} />
                  <p className="text-xs text-muted">{message.senderRole === "driver" ? "You" : "Fleet office"} · {formatTime(message.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div ref={threadRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-brand-soft px-3 py-4 sm:px-5">
          {loading ? <p className="text-center text-sm text-muted">Loading messages...</p> : null}
          {!loading && messages.length === 0 ? (
            <p className="mx-auto max-w-sm rounded-lg border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-muted">
              No messages yet. Notes from the fleet office will show up here.
            </p>
          ) : null}
          {messages.map((message) => {
            const day = dayLabel(message.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            const mine = message.senderRole === "driver";
            return (
              <div key={message.id}>
                {showDay && day ? (
                  <p className="mx-auto my-2 w-fit rounded-md bg-card px-2 py-1 text-[11px] font-medium text-muted">{day}</p>
                ) : null}
                <article className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[min(100%,28rem)] rounded-lg px-3 py-2 shadow-[0_1px_2px_rgba(17,22,16,0.06)] ${mine ? "rounded-br-sm bg-brand text-ink" : "rounded-bl-sm bg-card text-ink"}`}>
                    {message.body ? <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p> : null}
                    {message.fileIds?.length ? (
                      <div className={`space-y-2 ${message.body ? "mt-2" : ""}`}>
                        {message.fileIds.map((fileId) => <ChatFile key={fileId} fileId={fileId} />)}
                      </div>
                    ) : null}
                    <p className="mt-1 text-right text-[11px] text-ink/70">{formatTime(message.createdAt)}</p>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
        )}

        <form onSubmit={send} className="border-t border-line bg-card px-3 py-3 sm:px-4">
          {error ? <p className="mb-2 text-sm text-status-danger">{error}</p> : null}
          {recording ? <p className="mb-2 text-sm text-ink">Recording a voice note. Tap stop when you are done.</p> : null}
          {files.length > 0 ? (
            <ul className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-canvas px-2 py-1 text-xs text-ink">
                  <span className="max-w-[12rem] truncate">{file.name.startsWith("voice-") ? "Voice note" : file.name.startsWith("photo-") ? "Photo" : file.name}</span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-end gap-1.5 sm:gap-2">
            <input ref={cameraRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink hover:bg-brand-soft disabled:opacity-50" aria-label="Take a photo" disabled={pending || recording} onClick={() => cameraRef.current?.click()}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M8 7.5l1.2-2h5.6L16 7.5h2.5v10h-13v-10z" strokeLinejoin="round" />
                <circle cx="12" cy="12.5" r="2.5" />
              </svg>
            </button>
            <button type="button" className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink hover:bg-brand-soft disabled:opacity-50 ${recording ? "bg-highlight" : ""}`} aria-label={recording ? "Stop recording" : "Record a voice note"} disabled={pending} onClick={() => void toggleRecording()}>
              {recording ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <rect x="9" y="4" width="6" height="10" rx="3" />
                  <path d="M7 11a5 5 0 0 0 10 0M12 16v3" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <textarea
              value={draft}
              maxLength={500}
              rows={1}
              placeholder="Write a message"
              aria-label="Message"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/25"
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand text-ink hover:bg-brand-strong disabled:opacity-50" aria-label="Send message" disabled={pending || recording || (!draft.trim() && files.length === 0)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </DriverShell>
  );
}
