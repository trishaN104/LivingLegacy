// Renders unedited recorder content. Do not transform.

import type { TranscriptBlock } from "@/lib/types";

export function VerbatimTranscript({ blocks }: { blocks: TranscriptBlock[] }) {
  // Group consecutive blocks under their chapter title.
  const chapters = groupIntoChapters(blocks);
  return (
    <div className="reading-width mx-auto type-transcript text-secondary">
      {chapters.map((c, i) => (
        <section key={i} className="mt-xl first:mt-0">
          {c.title && (
            <h3 className="type-display-m mb-md text-foliage-deep">{c.title}</h3>
          )}
          {c.blocks.map((b, j) => (
            <p
              key={j}
              className={`mt-md first:mt-0 ${
                b.speaker === "interviewer"
                  ? "type-pullquote text-blush-deep before:mr-2 before:content-['—']"
                  : ""
              }`}
            >
              {b.text}
            </p>
          ))}
        </section>
      ))}
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
