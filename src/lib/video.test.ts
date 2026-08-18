import { describe, expect, it } from "vitest";
import { toEmbedVideoUrl } from "./video";

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
