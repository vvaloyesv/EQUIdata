/**
 * Ensambla el feed de Comunidad: cada post con su autor real, conteo de
 * likes, si ya le diste like, y cuántas respuestas tiene. Compartido entre
 * la vista del estudiante y la del profesor — ambos ven el mismo feed.
 */

import type { Repository } from "@/lib/data/repository";
import type { CommunityPost } from "@/lib/domain/types";

export interface CommunityPostVM {
  post: CommunityPost;
  authorName: string;
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

/**
 * Nombre a mostrar para el autor de un post/respuesta, respetando su
 * preferencia de privacidad (`StudentProfile.showNameInCommunity`). Solo
 * aplica a estudiantes: si no tiene perfil (p. ej. el profesor), se muestra
 * su nombre real siempre.
 */
export async function resolveCommunityDisplayName(
  repo: Repository,
  authorId: string,
): Promise<string> {
  const [user, profile] = await Promise.all([
    repo.getUserById(authorId),
    repo.getStudentProfile(authorId),
  ]);
  if (profile && profile.showNameInCommunity === false) {
    return "Estudiante EQUIdata";
  }
  return user?.displayName ?? "Alguien";
}

export async function buildCommunityFeed(
  repo: Repository,
  userId: string,
): Promise<CommunityPostVM[]> {
  const posts = await repo.listCommunityPosts();
  const out: CommunityPostVM[] = [];
  for (const post of posts) {
    const [authorName, likes, replies] = await Promise.all([
      resolveCommunityDisplayName(repo, post.authorId),
      repo.listCommunityLikes(post.id),
      repo.listCommunityReplies(post.id),
    ]);
    out.push({
      post,
      authorName,
      likeCount: likes.length,
      likedByMe: likes.some((l) => l.userId === userId),
      replyCount: replies.length,
    });
  }
  return out;
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
