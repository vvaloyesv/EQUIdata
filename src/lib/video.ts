/**
 * YouTube solo permite embeberse en un iframe desde `/embed/VIDEO_ID` — una
 * URL normal de "ver" (`/watch?v=`) o de `youtu.be/` responde con
 * X-Frame-Options y el navegador rechaza la conexión. El profesor pega
 * cualquier link que copie de YouTube; esta función lo normaliza al formato
 * embebible. URLs que no sean de YouTube (u otro proveedor de video) se
 * devuelven sin tocar.
 */
export function toEmbedVideoUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.replace(/^(www|m)\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") return url;
  if (parsed.pathname.startsWith("/embed/")) return url;

  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = parsed.pathname.slice(1) || null;
  } else if (parsed.pathname === "/watch") {
    videoId = parsed.searchParams.get("v");
  } else if (parsed.pathname.startsWith("/shorts/")) {
    videoId = parsed.pathname.split("/")[2] ?? null;
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}
