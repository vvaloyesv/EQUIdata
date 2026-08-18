"use client";

import { useState } from "react";
import { Heart, MessageCircle, PenLine, SendHorizontal, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import {
  buildCommunityFeed,
  pickPostColor,
  resolveCommunityDisplayName,
  type CommunityPostVM,
} from "@/lib/student/community";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { EmptyState } from "@/components/ui/LockedState";

type CommunityCategory = "preguntas" | "hallazgos" | "retos" | "celebraciones";

const COLOR_STYLES: Record<
  string,
  { bg: string; border: string; tape: string; text: string }
> = {
  navy: {
    bg: "var(--color-navy-tint)",
    border: "var(--color-navy)",
    tape: "var(--color-lavender)",
    text: "var(--color-navy)",
  },
  coral: {
    bg: "var(--color-coral-tint)",
    border: "var(--color-coral)",
    tape: "var(--color-coral)",
    text: "var(--color-navy)",
  },
  lime: {
    bg: "var(--color-lime-tint)",
    border: "var(--color-lime)",
    tape: "var(--color-lime)",
    text: "var(--color-navy)",
  },
  lavender: {
    bg: "var(--color-lavender-tint)",
    border: "var(--color-lavender)",
    tape: "var(--color-lavender)",
    text: "var(--color-navy)",
  },
  warning: {
    bg: "#fff3d7",
    border: "var(--color-warning)",
    tape: "var(--color-warning)",
    text: "var(--color-navy)",
  },
};

const TOPICS: Array<{
  value: CommunityCategory;
  label: string;
  colorKey: keyof typeof COLOR_STYLES;
}> = [
  { value: "preguntas", label: "Preguntas", colorKey: "lavender" },
  { value: "hallazgos", label: "Hallazgos", colorKey: "lime" },
  { value: "retos", label: "Retos", colorKey: "warning" },
  { value: "celebraciones", label: "Celebraciones", colorKey: "coral" },
];

/**
 * Feed real de comunidad (posts, likes, respuestas) — compartido entre la
 * vista del estudiante y la del profesor, ambos ven exactamente lo mismo.
 * Grid de tarjetas de colores estilo "notas" (referencia visual del
 * usuario) — excepción deliberada y acotada a esta pantalla a la regla de
 * "1 acento por pantalla" del resto de la app: es un corcho de notas, no el
 * sistema de diseño general.
 */
export function CommunityFeed() {
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [posting, setPosting] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const { data: feed, loading } = useAsync(
    () => (user ? buildCommunityFeed(getRepository(), user.id) : Promise.resolve(null)),
    [user?.id, reloadKey],
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
    setPosting(false);
    setReloadKey((k) => k + 1);
  }

  async function toggleLike(postId: string) {
    if (!user) return;
    await getRepository().toggleCommunityLike(postId, user.id);
    setReloadKey((k) => k + 1);
  }

  if (loading || !feed) {
    return <BrandLoader size="sm" label="Cultivando comunidad..." />;
  }

  const openPost = feed.find((f) => f.post.id === openPostId) ?? null;

  return (
    <div>
      <div className="mb-8 rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-[linear-gradient(135deg,#ffffff_0%,var(--color-lavender-tint)_50%,var(--color-lime-tint)_100%)] p-4 shadow-[0_18px_45px_-34px_rgba(25,41,98,0.55)]">
        <div className="rounded-[var(--radius-token)] bg-white/82 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-white">
              <PenLine size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl text-[var(--color-navy)]">
                Deja una nota en el jardín
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Comparte una pregunta, un avance o algo que descubriste en tu ruta.
              </p>
            </div>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe tu nota para la comunidad..."
            rows={3}
            className="mt-4 w-full resize-none rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-hint)] focus-ring"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => {
                const color = COLOR_STYLES[topic.colorKey];
                const active = category === topic.value;
                return (
                <button
                  key={topic.value}
                  type="button"
                  onClick={() => setCategory(topic.value)}
                  className="rounded-[var(--radius-pill)] border px-3 py-1 text-xs shadow-[0_1px_2px_rgba(25,41,98,0.04)] transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: active ? color.bg : "rgba(255,255,255,0.75)",
                    borderColor: active ? color.border : "#fff",
                    color: active ? "var(--color-navy)" : "var(--color-muted)",
                  }}
                >
                  <span
                    className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color.border }}
                  />
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
        </div>
      </div>

      {feed.length === 0 ? (
        <EmptyState
          title="Todavía no hay publicaciones"
          hint="Sé la primera persona en compartir algo."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <Label>Notas recientes</Label>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {feed.length} publicación{feed.length !== 1 && "es"} compartida
                {feed.length !== 1 && "s"}
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white px-3 py-1.5 text-xs text-[var(--color-lavender-text)]">
              <Sparkles size={13} />
              Comunidad activa
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((item) => {
              const selectedTopic = TOPICS.find((t) => t.value === item.post.category);
              const color =
                COLOR_STYLES[selectedTopic?.colorKey ?? pickPostColor(item.post.id)];
              return (
                <div
                  key={item.post.id}
                  className="relative min-h-48 rounded-[var(--radius-card)] border p-5 shadow-[0_18px_34px_-28px_rgba(25,41,98,0.55)] transition-transform hover:-translate-y-1"
                  style={{
                    background: color.bg,
                    borderColor: color.border,
                    color: color.text,
                  }}
                >
                  <span
                    className="absolute left-1/2 top-0 h-5 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[6px] opacity-70"
                    style={{ background: color.tape }}
                  />
                  {selectedTopic && (
                    <span className="mb-3 inline-flex rounded-[var(--radius-pill)] border border-current/25 px-2.5 py-1 text-xs">
                      {selectedTopic.label}
                    </span>
                  )}
                  <p className="font-display text-lg leading-tight">{item.authorName}</p>
                  <div className="my-4 border-t border-dashed border-current/35" />
                  <p className="text-sm leading-relaxed">{item.post.body}</p>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <button
                      onClick={() => toggleLike(item.post.id)}
                      className="flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/60 px-2.5 py-1 transition-colors hover:bg-white"
                    >
                      <Heart
                        size={15}
                        fill={item.likedByMe ? "currentColor" : "none"}
                      />
                      {item.likeCount}
                    </button>
                    <button
                      onClick={() => setOpenPostId(item.post.id)}
                      className="flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/60 px-2.5 py-1 transition-colors hover:bg-white"
                    >
                      <MessageCircle size={15} />
                      {item.replyCount} respuestas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal open={!!openPost} onClose={() => setOpenPostId(null)}>
        {openPost && (
          <PostThread
            item={openPost}
            onReplySent={() => setReloadKey((k) => k + 1)}
          />
        )}
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
  const [localReload, setLocalReload] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { data: replies } = useAsync(async () => {
    const repo = getRepository();
    const list = await repo.listCommunityReplies(item.post.id);
    return Promise.all(
      list.map(async (reply) => ({
        reply,
        authorName: await resolveCommunityDisplayName(repo, reply.authorId),
      })),
    );
  }, [item.post.id, localReload]);

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
    setLocalReload((k) => k + 1);
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
