/**
 * Ensambla el feed de Comunidad: cada post con su autor real, conteo de
 * likes, si ya le diste like, y cuántas respuestas tiene. Compartido entre
 * la vista del estudiante y la del profesor — ambos ven el mismo feed.
 *
 * M10 · F4: el feed completo llega en una consulta (`listCommunityFeed`);
 * antes eran 4 por publicación.
 */

import type { Repository } from "@/lib/data/repository";
import type { CommunityPost, CommunityReply } from "@/lib/domain/types";

export interface CommunityPostVM {
  post: CommunityPost;
  authorName: string;
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

/** Nombre que se muestra cuando la persona pidió ocultar el suyo en Comunidad. */
const HIDDEN_NAME = "Estudiante EQUIdata";

export interface CommunityReplyVM {
  reply: CommunityReply;
  authorName: string;
}

/**
 * Respuestas de una publicación con el nombre de cada autor, respetando su
 * preferencia de privacidad (`StudentProfile.showNameInCommunity`). Solo
 * aplica a estudiantes: si no tiene perfil (p. ej. el profesor), se muestra
 * su nombre real siempre. Tres lecturas, sin importar cuántas respuestas
 * haya (antes, dos por respuesta).
 */
export async function buildReplyThread(
  repo: Repository,
  postId: string,
): Promise<CommunityReplyVM[]> {
  const replies = await repo.listCommunityReplies(postId);
  const authorIds = [...new Set(replies.map((r) => r.authorId))];
  // Solo quiénes ocultan su nombre — no los perfiles completos (que además
  // la RLS no deja ver a otras estudiantes).
  const [authors, hiddenIds] = await Promise.all([
    repo.listUsersByIds(authorIds),
    repo.listHiddenCommunityAuthorIds(),
  ]);
  const hidden = new Set(hiddenIds);
  return replies.map((reply) => ({
    reply,
    authorName: hidden.has(reply.authorId)
      ? HIDDEN_NAME
      : (authors.find((u) => u.id === reply.authorId)?.displayName ?? "Alguien"),
  }));
}

export async function buildCommunityFeed(
  repo: Repository,
  userId: string,
): Promise<CommunityPostVM[]> {
  const feed = await repo.listCommunityFeed();
  return feed.map((item) => ({
    post: item.post,
    authorName: item.authorHidesName ? HIDDEN_NAME : item.authorDisplayName,
    likeCount: item.likeUserIds.length,
    likedByMe: item.likeUserIds.includes(userId),
    replyCount: item.replyCount,
  }));
}

export type PostColor = "navy" | "coral" | "lime" | "lavender" | "warning";
const COLORS: PostColor[] = ["coral", "lime", "lavender", "navy", "warning"];

/** Color estable por post (no cambia entre renders) — hash simple del id. */
export function pickPostColor(postId: string): PostColor {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = (hash * 31 + postId.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}
