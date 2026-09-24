/**
 * "Ocultar mi nombre en Comunidad" (bug corregido en M10).
 *
 * En Supabase, la RLS de student_profiles solo deja leer el propio perfil.
 * La prueba reproduce esa restricción sobre el MockRepository: si el feed o
 * las respuestas dependieran de leer el perfil de otra persona, la
 * preferencia se perdería y se mostraría su nombre real, como pasaba antes.
 */

import { describe, expect, it } from "vitest";
import { MockRepository } from "@/lib/data/mock/MockRepository";
import type { Repository } from "@/lib/data/repository";
import { buildCommunityFeed, buildReplyThread } from "./community";

/** Repositorio visto por `viewerId` con la RLS de student_profiles: solo su propio perfil. */
function asStudent(repo: MockRepository, viewerId: string): Repository {
  return new Proxy(repo, {
    get(target, prop, receiver) {
      if (prop === "getStudentProfile") {
        return async (userId: string) => (userId === viewerId ? target.getStudentProfile(userId) : null);
      }
      if (prop === "listStudentProfiles") {
        return async () => (await target.listStudentProfiles()).filter((p) => p.userId === viewerId);
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Repository;
}

async function repoWithHiddenAuthor() {
  const repo = new MockRepository();
  await repo.saveStudentProfile({
    userId: "u-s2",
    nombres: "Autora",
    apellidos: "Reservada",
    cargo: "Analista",
    area: "Investigación",
    documentType: "CC",
    documentNumber: "1234567",
    completed: true,
    showNameInCommunity: false,
  });
  await repo.createCommunityPost({
    id: "post-privada",
    authorId: "u-s2",
    body: "Mi hallazgo de la semana",
    createdAt: "2026-09-24T12:00:00.000Z",
  });
  await repo.createCommunityReply({
    id: "reply-privada",
    postId: "post-privada",
    authorId: "u-s2",
    body: "Y una respuesta",
    createdAt: "2026-09-24T12:05:00.000Z",
  });
  return repo;
}

describe("privacidad del nombre en Comunidad", () => {
  it("otra estudiante no ve el nombre real en el feed", async () => {
    const repo = await repoWithHiddenAuthor();
    const feed = await buildCommunityFeed(asStudent(repo, "u-student"), "u-student");
    const post = feed.find((f) => f.post.id === "post-privada");
    expect(post?.authorName).toBe("Estudiante EQUIdata");
  });

  it("otra estudiante no ve el nombre real en las respuestas", async () => {
    const repo = await repoWithHiddenAuthor();
    const thread = await buildReplyThread(asStudent(repo, "u-student"), "post-privada");
    expect(thread[0]?.authorName).toBe("Estudiante EQUIdata");
  });

  it("quien no pidió ocultarlo se sigue viendo con su nombre", async () => {
    const repo = await repoWithHiddenAuthor();
    const feed = await buildCommunityFeed(asStudent(repo, "u-s2"), "u-s2");
    const others = feed.filter((f) => f.post.authorId !== "u-s2");
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((f) => f.authorName !== "Estudiante EQUIdata")).toBe(true);
  });
});
