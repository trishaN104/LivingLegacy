// Renders unedited recorder content. Do not transform.

import type { TranscriptBlock } from "@/lib/types";

export function VerbatimTranscript({ blocks }: { blocks: TranscriptBlock[] }) {
  // Group consecutive blocks under their chapter title.
  const chapters = groupIntoChapters(blocks);
  return (
    <div className="reading-width type-transcript text-secondary">
      {chapters.map((c, i) => {
        const firstRecorderIndex = c.blocks.findIndex(
          (b) => b.speaker === "recorder",
        );
        return (
          <section key={i} className="mt-2xl first:mt-0">
            {c.title && (
              <header className="mb-lg flex items-baseline gap-md">
                <span className="type-numeral text-tertiary text-[2.25rem] leading-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="type-display-m text-foliage-deep">{c.title}</h3>
              </header>
            )}
            {c.blocks.map((b, j) => {
              const isRecorder = b.speaker === "recorder";
              const dropCap = isRecorder && i === 0 && j === firstRecorderIndex;
              return (
                <p
                  key={j}
                  className={`mt-lg first:mt-0 ${
                    isRecorder
                      ? `text-primary ${dropCap ? "has-drop-cap" : ""}`
                      : "type-pullquote text-blush-deep before:mr-2 before:content-['—']"
                  }`}
                >
                  {b.text}
                </p>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function groupIntoChapters(blocks: TranscriptBlock[]) {
  const out: { title?: string; blocks: TranscriptBlock[] }[] = [];
  let current: { title?: string; blocks: TranscriptBlock[] } | null = null;
  for (const b of blocks) {
    if (b.chapterTitle) {
      if (current) out.push(current);
      current = { title: b.chapterTitle, blocks: [b] };
    } else {
      if (!current) current = { blocks: [] };
      current.blocks.push(b);
    }
  }
  if (current) out.push(current);
  return out;
}
