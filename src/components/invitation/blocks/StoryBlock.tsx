import type { CSSProperties } from "react";
import { textStyle } from "@/lib/textStyle";
import { blockTitle, findBlock } from "@/lib/blocks";
import { Section } from "../Section";
import type { BlockProps } from "./types";

/** Текст, который проявляется по словам; целиком он лежит в sr-only для скринридеров. */
function WordByWord({ text }: { text: string }) {
  let index = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split("\n").map((line, l) => (
          <span key={l} className="block min-h-[1lh]">
            {line
              .split(/\s+/)
              .filter(Boolean)
              .map((word, w) => (
                <span key={w}>
                  {w > 0 && " "}
                  <span className="inv-word inline-block" style={{ "--i": index++ } as CSSProperties}>
                    {word}
                  </span>
                </span>
              ))}
          </span>
        ))}
      </span>
    </>
  );
}

/**
 * «Текст или цитата»: с заголовком — текст выплывает снизу; без заголовка — цитата (кавычка из размытия,
 * слова по одному, пульсирует сердечко). «Фото и текст» и «Письмо» — отдельные виды.
 */
export function StoryBlock({ block, ctx }: BlockProps<"story">) {
  if (block.variant === "photo") {
    return (
      <Section block={block}>
        {block.photo && (
          <div className="relative mx-auto mb-10 w-[80%] max-w-[320px]">
            <span aria-hidden="true" className="absolute top-3 left-3 -right-3 -bottom-3 rounded-[20px] border border-[var(--accent)]/60" data-reveal="3" data-anim="fade" />
            <div className="relative overflow-hidden rounded-[20px]" data-reveal="2" data-anim="curtain">
              <img src={block.photo} alt="" className="aspect-[4/5] w-full object-cover" />
            </div>
          </div>
        )}
        <p className="mx-auto max-w-sm whitespace-pre-line text-xl leading-relaxed" data-reveal="3" style={textStyle(block, "text")} data-field="text">
          {block.text}
        </p>
      </Section>
    );
  }

  if (block.variant === "letter") {
    const names = findBlock(ctx.data, "hero")?.names;
    const text = block.text.trim();
    return (
      <Section block={block}>
        <div className="inv-letter relative mx-auto max-w-sm rounded-sm px-7 pt-8 pb-7 text-left text-[#3e3630]" data-reveal="2" data-anim="drop">
          <p className="whitespace-pre-line text-lg leading-[2rem]" style={textStyle(block, "text")} data-field="text">
            <span aria-hidden="true" className="inv-letter-cap">
              {text.charAt(0)}
            </span>
            <span className="sr-only">{text.charAt(0)}</span>
            <WordByWord text={text.slice(1)} />
          </p>
          {names && (
            <p className="mt-6 text-right">
              <span className="block text-sm italic opacity-70">С любовью,</span>
              <span className="inv-script inline-block text-3xl" data-reveal="3" data-anim="write" data-delay="1.4">
                {names}
              </span>
            </p>
          )}
        </div>
      </Section>
    );
  }

  const quote = !blockTitle(block) && !block.scriptLine;
  return (
    <Section block={block}>
      {quote ? (
        <>
          <div aria-hidden="true" className="-mb-2 text-5xl leading-none text-[var(--accent)] opacity-70" data-reveal="1" data-anim="blur">
            “
          </div>
          <p className="mx-auto max-w-sm text-xl leading-relaxed" data-reveal="2" data-anim="fade" style={textStyle(block, "text")} data-field="text">
            <WordByWord text={block.text} />
          </p>
          <div className="inv-divider mt-6 text-sm" aria-hidden="true" data-reveal="4">
            <span className="inv-pulse inline-block">♡</span>
          </div>
        </>
      ) : (
        <p className="mx-auto max-w-sm whitespace-pre-line text-xl leading-relaxed" data-reveal="3" style={textStyle(block, "text")} data-field="text">
          {block.text}
        </p>
      )}
    </Section>
  );
}
