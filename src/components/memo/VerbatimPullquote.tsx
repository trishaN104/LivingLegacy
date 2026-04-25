// Renders unedited recorder content. Do not transform.

export function VerbatimPullquote({ text }: { text: string }) {
  return (
    <figure className="rounded-lg bg-surface px-lg py-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <blockquote className="type-pullquote reading-width text-primary">
        <span className="select-none text-blush-deep">“</span>
        {text}
        <span className="select-none text-blush-deep">”</span>
      </blockquote>
    </figure>
  );
}
