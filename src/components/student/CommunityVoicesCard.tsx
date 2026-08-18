"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shuffle, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildCommunityFeed } from "@/lib/student/community";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/LockedState";

const CARD_COLORS = [
  { bg: "var(--color-coral-tint)", border: "var(--color-coral)", text: "var(--color-navy)" },
  { bg: "var(--color-lavender-tint)", border: "var(--color-lavender)", text: "var(--color-navy)" },
  { bg: "var(--color-lime-tint)", border: "var(--color-lime)", text: "var(--color-navy)" },
] as const;

function pickRandomIndices(length: number, count: number): number[] {
  const pool = Array.from({ length }, (_, i) => i);
  const chosen: number[] = [];
  while (chosen.length < Math.min(count, length) && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(i, 1)[0]);
  }
  return chosen;
}

export function CommunityVoicesCard() {
  const { user } = useAuth();
  const { data: feed } = useAsync(
    () => (user ? buildCommunityFeed(getRepository(), user.id) : Promise.resolve(null)),
    [user?.id],
  );
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (feed) setSelected(pickRandomIndices(feed.length, 3));
  }, [feed]);

  function shuffle() {
    if (!feed) return;
    setSelected(pickRandomIndices(feed.length, 3));
  }

  const voices = selected.map((i) => feed?.[i]).filter(Boolean);

  return (
    <div className="mt-3">
      <div className="mb-3 flex items-center justify-between">
        <Label>Voces de la comunidad</Label>
        {feed && feed.length > 1 && (
          <button
            onClick={shuffle}
            className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-divider)] px-2.5 py-1 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-lavender)] hover:text-[var(--color-lavender-text)]"
          >
            <Shuffle size={12} /> Barajar
          </button>
        )}
      </div>

      {!feed || voices.length === 0 ? (
        <EmptyState
          title="Todavía no hay publicaciones"
          hint="Sé la primera persona en compartir algo en Comunidad."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {voices.map((v, idx) => {
            const color = CARD_COLORS[idx % CARD_COLORS.length];
            return (
              <div
                key={v!.post.id}
                className="flex flex-col justify-between rounded-[var(--radius-card)] p-4"
                style={{
                  backgroundColor: color.bg,
                  borderTop: `3px solid ${color.border}`,
                  minHeight: 140,
                }}
              >
                <p
                  className="line-clamp-4 text-sm leading-relaxed"
                  style={{ color: color.text }}
                >
                  &ldquo;{v!.post.body}&rdquo;
                </p>
                <Label className="mt-3">{v!.authorName}</Label>
              </div>
            );
          })}

          <Link
            href="/community"
            className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-divider)] p-4 text-[var(--color-muted)] transition-colors hover:border-[var(--color-lavender)] hover:text-[var(--color-lavender-text)]"
            style={{ minHeight: 140 }}
          >
            <MessageCircle size={24} />
            <span className="text-xs font-medium">Ver comunidad</span>
          </Link>
        </div>
      )}
    </div>
  );
}
