import { textures } from "@/lib/library";
import type { Texture } from "@/lib/schema";

/**
 * Слой текстуры поверх фона. Узоры нарисованы чёрным: на светлой теме они затемняют фон (multiply),
 * на тёмной — инвертируются и осветляют его (screen). Цветные текстуры (акварель) кладутся как есть.
 */
export function TextureLayer({ texture, dark = false }: { texture: Texture; dark?: boolean }) {
  if (texture === "none") return null;
  const t = textures[texture];
  const inverted = dark && !t.tinted;
  return (
    <div
      aria-hidden="true"
      data-testid="texture"
      data-texture={texture}
      className="pointer-events-none absolute inset-0"
      style={{
        background: t.css,
        opacity: t.opacity,
        mixBlendMode: t.tinted ? "normal" : inverted ? "screen" : "multiply",
        filter: inverted ? "invert(1)" : undefined,
      }}
    />
  );
}
