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

  // Todos los interlocutores en una consulta (M10 · F4), no uno por conversación.
  const others = await repo.listUsersByIds([...byOther.keys()]);
  const nameById = new Map(others.map((u) => [u.id, u.displayName]));

  const conversations: Conversation[] = [];
  for (const [otherId, msgs] of byOther) {
    const sorted = [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    conversations.push({
      otherUserId: otherId,
      otherName: nameById.get(otherId) ?? "Usuario",
      messages: sorted,
      lastMessageAt: sorted[sorted.length - 1]?.createdAt ?? "",
      unreadCount: sorted.filter((m) => m.toUserId === userId && !m.read).length,
    });
  }

  return conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

/** Total de mensajes sin leer del usuario — para el badge del sidebar y la campana del dashboard. Una consulta de conteo, sin traer los mensajes. */
export async function getUnreadMessageCount(
  repo: Repository,
  userId: string,
): Promise<number> {
  return repo.countUnreadMessages(userId);
}
