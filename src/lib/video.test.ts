import { describe, expect, it } from "vitest";
import { toEmbedVideoUrl, youTubeIdOf, youTubePlayerUrl } from "./video";

describe("youTubeIdOf", () => {
  it("saca el id de cualquier formato de YouTube", () => {
    expect(youTubeIdOf("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe("dQw4w9WgXcQ");
    expect(youTubeIdOf("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youTubeIdOf("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("devuelve null si no es YouTube", () => {
    expect(youTubeIdOf("https://player.vimeo.com/video/12345")).toBeNull();
    expect(youTubeIdOf("no es una url")).toBeNull();
  });

  it("el reproductor usa youtube-nocookie con autoplay", () => {
    expect(youTubePlayerUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&enablejsapi=1",
    );
  });
});

describe("toEmbedVideoUrl", () => {
  it("convierte una URL de watch", () => {
    expect(toEmbedVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("convierte una URL de watch con parámetros extra", () => {
    expect(
      toEmbedVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=42s"),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("convierte una URL corta youtu.be", () => {
    expect(toEmbedVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("convierte una URL de shorts", () => {
    expect(toEmbedVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("deja igual una URL que ya es de embed", () => {
    const embed = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    expect(toEmbedVideoUrl(embed)).toBe(embed);
  });

  it("deja igual una URL de otro proveedor", () => {
    const vimeo = "https://player.vimeo.com/video/12345";
    expect(toEmbedVideoUrl(vimeo)).toBe(vimeo);
  });

  it("deja igual texto que no es una URL válida", () => {
    expect(toEmbedVideoUrl("no es una url")).toBe("no es una url");
  });
});
