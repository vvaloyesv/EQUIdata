/** Agrupa los mensajes del usuario en conversaciones por interlocutor. */

import type { Repository } from "@/lib/data/repository";
import type { Message } from "@/lib/domain/types";

export interface Conversation {
  otherUserId: string;
  otherName: string;
  messages: Message[];
  lastMessageAt: string;
  unreadCount: number;
}

export async function buildConversations(
  repo: Repository,
  userId: string,
): Promise<Conversation[]> {
  const messages = await repo.listMessages(userId);

  const byOther = new Map<string, Message[]>();
  for (const m of messages) {
    const otherId = m.fromUserId === userId ? m.toUserId : m.fromUserId;
    if (!byOther.has(otherId)) byOther.set(otherId, []);
    byOther.get(otherId)!.push(m);
  }

  const conversations: Conversation[] = [];
  for (const [otherId, msgs] of byOther) {
    const other = await repo.getUserById(otherId);
    const sorted = [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    conversations.push({
      otherUserId: otherId,
      otherName: other?.displayName ?? "Usuario",
      messages: sorted,
      lastMessageAt: sorted[sorted.length - 1]?.createdAt ?? "",
      unreadCount: sorted.filter((m) => m.toUserId === userId && !m.read).length,
    });
  }

  return conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

/** Total de mensajes sin leer del usuario — para el badge del sidebar y la campana del dashboard. */
export async function getUnreadMessageCount(
  repo: Repository,
  userId: string,
): Promise<number> {
  const conversations = await buildConversations(repo, userId);
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}
