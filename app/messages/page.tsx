"use client";

import { FormEvent, useEffect, useState } from "react";
import { DriverShell } from "../../components/DriverShell";
import { Notice, PageHeader, Panel, PrimaryButton, Skeleton } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";

type Message = {
  id: string;
  senderRole: "admin" | "driver";
  body: string;
  createdAt: string | null;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ data: Message[] }>("/me/messages")
      .then((result) => setMessages(result.data))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load messages"))
      .finally(() => setLoading(false));
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) {
      setFieldError("Write a message.");
      return;
    }
    setPending(true);
    setFieldError("");
    setError("");
    try {
      const result = await api<{ data: Message }>("/me/messages", { method: "POST", body: { body } });
      setMessages((current) => [...current, result.data]);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the message");
    } finally {
      setPending(false);
    }
  }

  return (
    <DriverShell>
      <PageHeader title="Messages" description="Read notes from the fleet office and send a reply." />
      {error ? <div className="mb-4"><Notice tone="danger">{error}</Notice></div> : null}

      <Panel title="Conversation" className="flex min-h-[32rem] flex-col">
        <div className="flex min-h-80 flex-1 flex-col gap-3">
          {loading ? <Skeleton className="h-24" /> : null}
          {!loading && messages.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-canvas px-4 py-8 text-center text-sm text-muted">No messages yet. Replies from the fleet office will appear here.</p>
          ) : null}
          {messages.map((message) => {
            const mine = message.senderRole === "driver";
            return (
              <article key={message.id} className={`max-w-xl rounded-md px-4 py-3 text-sm ${mine ? "ml-auto bg-brand text-white" : "border border-line bg-canvas"}`}>
                <p className={`text-xs font-medium ${mine ? "opacity-80" : "text-muted"}`}>{mine ? "You" : "Fleet office"}</p>
                <p className="mt-1 whitespace-pre-wrap leading-6">{message.body}</p>
                <p className={`mt-2 text-xs ${mine ? "opacity-80" : "text-muted"}`}>{formatDateTime(message.createdAt)}</p>
              </article>
            );
          })}
        </div>
        <form onSubmit={send} className="mt-5 border-t border-line pt-4">
          <label className="block text-sm" htmlFor="reply">
            <span className="mb-1.5 block font-medium">Reply</span>
            <textarea
              id="reply"
              value={draft}
              maxLength={500}
              rows={3}
              className={`w-full rounded-md border bg-card px-3 py-2.5 text-sm ${fieldError ? "border-status-danger" : "border-line"}`}
              onChange={(event) => {
                setDraft(event.target.value);
                setFieldError("");
              }}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {fieldError ? <p className="text-sm text-status-danger">{fieldError}</p> : <p className="text-xs text-muted">{draft.length}/500</p>}
            <PrimaryButton disabled={pending}>{pending ? "Sending..." : "Send reply"}</PrimaryButton>
          </div>
        </form>
      </Panel>
    </DriverShell>
  );
}
