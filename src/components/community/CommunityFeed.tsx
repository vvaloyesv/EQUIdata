"use client";

import { useState } from "react";
import { Heart, MessageCircle, PenLine, SendHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { queryKeys, useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import {
  buildCommunityFeed,
  buildReplyThread,
  type CommunityPostVM,
} from "@/lib/student/community";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { EmptyState } from "@/components/ui/LockedState";
import { cn } from "@/lib/cn";
import { relativeDays } from "@/lib/dates";

type CommunityCategory = "preguntas" | "hallazgos" | "retos" | "celebraciones";

/** Color de categoría: solo el filete lateral de la nota y el punto del filtro. */
const TOPICS: Array<{ value: CommunityCategory; label: string; color: string }> = [
  { value: "preguntas", label: "Preguntas", color: "var(--color-lavender)" },
  { value: "hallazgos", label: "Hallazgos", color: "var(--color-lime)" },
  { value: "retos", label: "Retos", color: "var(--color-warning)" },
  { value: "celebraciones", label: "Celebraciones", color: "var(--color-coral)" },
];

/**
 * Feed real de comunidad (posts, likes, respuestas) — compartido entre la
 * vista del estudiante y la del profesor, ambos ven exactamente lo mismo.
 * Re-vestido con la guía (auditoría §11.2): notas blancas con un filete del
 * color de su categoría; sin degradados, sin cinta, sin sombra + borde + fondo.
 */
export function CommunityFeed() {
  const { user } = useAuth();
  const refresh = useRefresh();
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [posting, setPosting] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const userId = user?.id ?? "";

  // Misma lectura que "Voces de la comunidad" del dashboard.
  const { data: feed, loading } = useRepoQuery(
    queryKeys.communityFeed(userId),
    () => buildCommunityFeed(getRepository(), userId),
    { enabled: !!user },
  );

  async function publish() {
    if (!user || !draft.trim() || !category) return;
    setPosting(true);
    await getRepository().createCommunityPost({
      id: `post-${crypto.randomUUID()}`,
      authorId: user.id,
      body: draft.trim(),
      category,
      createdAt: new Date().toISOString(),
    });
    setDraft("");
    setCategory(null);
    await refresh();
    setPosting(false);
  }

  async function toggleLike(postId: string) {
    if (!user) return;
    await getRepository().toggleCommunityLike(postId, user.id);
    await refresh();
  }

  if (loading || !feed) {
    return <BrandLoader size="sm" label="Cargando la comunidad..." />;
  }

  const openPost = feed.find((f) => f.post.id === openPostId) ?? null;

  return (
    <div>
      <section className="mb-10 rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-white p-6">
        <label htmlFor="community-draft" className="flex items-center gap-2">
          <PenLine size={15} className="text-[var(--color-navy)]" />
          <Label>Nueva nota</Label>
        </label>
        <textarea
          id="community-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ej.: ¿Cuándo conviene usar la mediana en lugar de la media con datos de ingresos?"
          rows={3}
          className="mt-3 w-full resize-none rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-hint)] focus-ring"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
            {TOPICS.map((topic) => {
              const active = category === topic.value;
              return (
                <button
                  key={topic.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategory(topic.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1 text-xs transition-colors focus-ring",
                    active
                      ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                      : "border-[var(--color-divider)] text-[var(--color-muted)] hover:border-[var(--color-navy)]/40",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                  {topic.label}
                </button>
              );
            })}
          </div>

          <Button onClick={publish} disabled={posting || !draft.trim() || !category}>
            {posting ? "Publicando…" : "Publicar nota"}
            <SendHorizontal size={15} />
          </Button>
        </div>
        {draft.trim() && !category && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">Elige una categoría para publicar.</p>
        )}
      </section>

      {feed.length === 0 ? (
        <EmptyState
          title="Todavía no hay publicaciones."
          hint="Comparte la primera: una pregunta, un hallazgo o un avance de tu ruta."
        />
      ) : (
        <>
          <div className="mb-4">
            <Label>
              Notas recientes · {feed.length} {feed.length === 1 ? "publicación" : "publicaciones"}
            </Label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((item) => {
              const topic = TOPICS.find((t) => t.value === item.post.category);
              return (
                <article
                  key={item.post.id}
                  className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-white p-5 pl-6"
                  style={{ boxShadow: `inset 3px 0 0 ${topic?.color ?? "var(--color-lavender)"}` }}
                >
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    {topic?.label ?? "Nota"} · {relativeDays(item.post.createdAt)}
                  </span>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-navy)]">{item.post.body}</p>
                  <p className="mt-4 text-sm font-medium text-[var(--color-navy)]">{item.authorName}</p>
                  <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-divider)] pt-3 text-sm text-[var(--color-muted)]">
                    <button
                      onClick={() => toggleLike(item.post.id)}
                      aria-pressed={item.likedByMe}
                      className={cn(
                        "flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 transition-colors hover:bg-[var(--color-canvas)]",
                        item.likedByMe && "text-[var(--color-coral)]",
                      )}
                    >
                      <Heart size={15} fill={item.likedByMe ? "currentColor" : "none"} />
                      <span className="tabular-nums">{item.likeCount}</span>
                    </button>
                    <button
                      onClick={() => setOpenPostId(item.post.id)}
                      className="flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 transition-colors hover:bg-[var(--color-canvas)]"
                    >
                      <MessageCircle size={15} />
                      <span className="tabular-nums">{item.replyCount}</span>
                      {item.replyCount === 1 ? "respuesta" : "respuestas"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <Modal open={!!openPost} onClose={() => setOpenPostId(null)}>
        {openPost && <PostThread item={openPost} onReplySent={() => void refresh()} />}
      </Modal>
    </div>
  );
}

function PostThread({
  item,
  onReplySent,
}: {
  item: CommunityPostVM;
  onReplySent: () => void;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { data: replies } = useRepoQuery(["community-replies", item.post.id], () =>
    buildReplyThread(getRepository(), item.post.id),
  );

  async function send() {
    if (!user || !draft.trim()) return;
    setSending(true);
    await getRepository().createCommunityReply({
      id: `reply-${crypto.randomUUID()}`,
      postId: item.post.id,
      authorId: user.id,
      body: draft.trim(),
      createdAt: new Date().toISOString(),
    });
    setDraft("");
    setSending(false);
    // El refresco del padre también vuelve a pedir este hilo (misma caché).
    onReplySent();
  }

  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-navy)]">{item.authorName}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">
        {item.post.body}
      </p>

      <div className="mt-5 border-t border-[var(--color-divider)] pt-4">
        <Label>Respuestas</Label>
        <div className="mt-3 space-y-3">
          {!replies || replies.length === 0 ? (
            <p className="text-sm text-[var(--color-hint)]">
              Todavía no hay respuestas.
            </p>
          ) : (
            replies.map(({ reply, authorName }) => (
              <div
                key={reply.id}
                className="rounded-[var(--radius-token)] bg-[var(--color-canvas)] p-3"
              >
                <p className="text-xs font-medium text-[var(--color-navy)]">
                  {authorName}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink)]">{reply.body}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe una respuesta…"
          className="flex-1 rounded-[var(--radius-token)] border border-[var(--color-divider)] px-3.5 py-2 text-sm focus-ring"
        />
        <Button onClick={send} disabled={sending || !draft.trim()}>
          Responder
        </Button>
      </div>
    </div>
  );
}
