"use client";

import { useEffect, useState } from "react";
import { Send, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildConversations } from "@/lib/student/messages";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/LockedState";

export default function TeacherMessagesPage() {
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [activeId, setActiveId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const [recipientKind, setRecipientKind] = useState<"student" | "course">("student");
  const [recipientId, setRecipientId] = useState<string>();
  const [broadcastNote, setBroadcastNote] = useState<string>();

  const { data: conversations, loading } = useAsync(
    () => (user ? buildConversations(getRepository(), user.id) : Promise.resolve([])),
    [user?.id, reloadKey],
  );
  const { data: students } = useAsync(() => getRepository().listUsersByRole("student"), []);
  const { data: courses } = useAsync(() => getRepository().listCourses(), []);

  const active = conversations?.find((c) => c.otherUserId === activeId) ?? conversations?.[0];

  useEffect(() => {
    if (!user || !active || active.unreadCount === 0) return;
    void getRepository()
      .markConversationRead(user.id, active.otherUserId)
      .then(() => setReloadKey((k) => k + 1));
  }, [active?.otherUserId, active?.unreadCount, user?.id]);

  async function send() {
    if (!user || !active || !draft.trim()) return;
    await getRepository().sendMessage({
      id: `msg-${crypto.randomUUID()}`,
      fromUserId: user.id,
      toUserId: active.otherUserId,
      body: draft.trim(),
      createdAt: new Date().toISOString(),
      read: true,
    });
    setDraft("");
    setReloadKey((k) => k + 1);
  }

  async function sendNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !recipientId) return;
    const form = new FormData(e.currentTarget);
    const body = String(form.get("body") ?? "").trim();
    if (!body) return;
    const repo = getRepository();

    if (recipientKind === "student") {
      await repo.sendMessage({
        id: `msg-${crypto.randomUUID()}`,
        fromUserId: user.id,
        toUserId: recipientId,
        body,
        createdAt: new Date().toISOString(),
        read: false,
      });
      setActiveId(recipientId);
    } else {
      const enrollments = await repo.listEnrollmentsByCourse(recipientId);
      for (const e of enrollments) {
        await repo.sendMessage({
          id: `msg-${crypto.randomUUID()}`,
          fromUserId: user.id,
          toUserId: e.userId,
          courseId: recipientId,
          body,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
      setBroadcastNote(`Enviado a ${enrollments.length} estudiantes del curso.`);
    }
    setComposing(false);
    setRecipientId(undefined);
    setReloadKey((k) => k + 1);
  }

  if (loading || !conversations) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label>Bandeja</Label>
          <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
            Mensajes
          </h1>
        </div>
        <Button
          className="!px-3.5 !py-1.5 text-xs"
          onClick={() => {
            setComposing((v) => !v);
            setBroadcastNote(undefined);
          }}
        >
          <Plus size={13} /> Nuevo mensaje
        </Button>
      </div>

      {broadcastNote && (
        <div className="mt-4 rounded-[var(--radius-token)] bg-[var(--color-lime-tint)] px-4 py-2.5 text-sm text-[var(--color-lime-text)]">
          {broadcastNote}
        </div>
      )}

      {composing && (
        <Card bordered className="mt-4">
          <form onSubmit={sendNew} className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecipientKind("student")}
                className={cn(
                  "rounded-[var(--radius-pill)] px-3 py-1.5 text-xs",
                  recipientKind === "student"
                    ? "bg-[var(--color-navy)] text-white"
                    : "bg-[var(--color-canvas)] text-[var(--color-muted)]",
                )}
              >
                Un estudiante
              </button>
              <button
                type="button"
                onClick={() => setRecipientKind("course")}
                className={cn(
                  "rounded-[var(--radius-pill)] px-3 py-1.5 text-xs",
                  recipientKind === "course"
                    ? "bg-[var(--color-navy)] text-white"
                    : "bg-[var(--color-canvas)] text-[var(--color-muted)]",
                )}
              >
                Todo un curso
              </button>
            </div>

            <select
              required
              value={recipientId ?? ""}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
            >
              <option value="" disabled>
                {recipientKind === "student" ? "Selecciona un estudiante" : "Selecciona un curso"}
              </option>
              {recipientKind === "student"
                ? students?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))
                : courses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
            </select>

            <textarea
              name="body"
              rows={3}
              required
              placeholder="Escribe tu mensaje…"
              className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] focus-ring"
            />

            <div className="flex gap-2">
              <Button type="submit" className="!px-4 !py-2 text-sm">
                Enviar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!px-4 !py-2 text-sm"
                onClick={() => setComposing(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {conversations.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Sin mensajes todavía" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Card bordered className="!p-2">
            {conversations.map((c) => (
              <button
                key={c.otherUserId}
                onClick={() => setActiveId(c.otherUserId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-token)] p-3 text-left transition-colors",
                  active?.otherUserId === c.otherUserId
                    ? "bg-[var(--color-lime-tint)]"
                    : "hover:bg-[var(--color-canvas)]",
                )}
              >
                <Avatar name={c.otherName} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-navy)]">
                    {c.otherName}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {c.messages[c.messages.length - 1]?.body}
                  </p>
                </div>
                {c.unreadCount > 0 && <Badge tone="coral">{c.unreadCount}</Badge>}
              </button>
            ))}
          </Card>

          {active && (
            <Card bordered className="flex h-[520px] flex-col">
              <div className="flex items-center gap-3 border-b border-[var(--color-divider)] pb-3">
                <Avatar name={active.otherName} size={32} />
                <p className="font-medium text-[var(--color-navy)]">{active.otherName}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {active.messages.map((m) => {
                  const mine = m.fromUserId === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-[var(--radius-card)] px-3.5 py-2.5 text-sm",
                          mine
                            ? "bg-[var(--color-navy)] text-white"
                            : "bg-[var(--color-canvas)] text-[var(--color-navy)]",
                        )}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 border-t border-[var(--color-divider)] pt-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Escribe un mensaje…"
                  className="flex-1 rounded-[var(--radius-pill)] border border-[var(--color-divider)] px-4 py-2 text-sm focus-ring"
                />
                <button
                  onClick={send}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"
                >
                  <Send size={15} />
                </button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
