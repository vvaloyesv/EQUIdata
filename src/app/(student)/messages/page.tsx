"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildConversations } from "@/lib/student/messages";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/LockedState";

/** Mensajería bidireccional (spec §5.10): el estudiante recibe y envía. */
export default function MessagesPage() {
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [activeId, setActiveId] = useState<string>();
  const [draft, setDraft] = useState("");

  const { data: conversations, loading } = useAsync(
    () =>
      user
        ? buildConversations(getRepository(), user.id)
        : Promise.resolve([]),
    [user?.id, reloadKey],
  );

  const active = conversations?.find((c) => c.otherUserId === activeId) ?? conversations?.[0];

  useEffect(() => {
    if (!user || !active || active.unreadCount === 0) return;
    void getRepository()
      .markConversationRead(user.id, active.otherUserId)
      .then(() => {
        window.dispatchEvent(new Event("equidata:messages-read"));
        setReloadKey((k) => k + 1);
      });
  }, [active?.otherUserId, active?.unreadCount, user?.id]);

  if (loading || !conversations) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Label>Bandeja</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Mensajes
      </h1>

      {conversations.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Sin mensajes todavía" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* Lista de conversaciones */}
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

          {/* Hilo activo */}
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
                    <div
                      key={m.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
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
