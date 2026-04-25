"use client";

// Cherry blossoms + sage leaves in each corner. Frames the page like an
// heirloom. Inline SVG — see DESIGN.md "Don'ts": don't use {colors.blush-plate}
// on more than one generation in the tree, but corner blossoms are decorative
// ornaments, not plates.

export function CornerOrnaments() {
  return (
    <>
      <Ornament className="absolute -left-4 -top-4 h-40 w-40 rotate-0" />
      <Ornament className="absolute -right-4 -top-4 h-40 w-40 -scale-x-100" />
      <Ornament className="absolute -left-4 -bottom-4 h-40 w-40 -scale-y-100" />
      <Ornament className="absolute -right-4 -bottom-4 h-40 w-40 scale-x-[-1] scale-y-[-1]" />
    </>
  );
}

function Ornament({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className={className}
    >
      {/* Branch */}
      <path
        d="M 5 10 C 60 30, 110 70, 160 130"
        stroke="#9c8975"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* Sage leaves along the branch */}
      <g fill="#9da98c" opacity="0.7">
        <ellipse cx="35" cy="22" rx="14" ry="6" transform="rotate(20 35 22)" />
        <ellipse cx="58" cy="42" rx="13" ry="6" transform="rotate(35 58 42)" />
        <ellipse cx="80" cy="62" rx="12" ry="6" transform="rotate(40 80 62)" />
        <ellipse cx="105" cy="84" rx="13" ry="6" transform="rotate(50 105 84)" />
        <ellipse cx="130" cy="106" rx="12" ry="6" transform="rotate(60 130 106)" />
      </g>
      {/* Cherry blossoms */}
      <g>
        <Blossom cx={48} cy={28} />
        <Blossom cx={92} cy={58} small />
        <Blossom cx={120} cy={92} />
        <Blossom cx={150} cy={130} small />
        <Blossom cx={28} cy={70} small />
      </g>
    </svg>
  );
}

function Blossom({ cx, cy, small = false }: { cx: number; cy: number; small?: boolean }) {
  const r = small ? 4 : 6;
  const petals = 5;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    out.push(
      <ellipse
        key={i}
        cx={cx + Math.cos(angle) * r * 0.7}
        cy={cy + Math.sin(angle) * r * 0.7}
        rx={r}
        ry={r * 0.75}
        fill="#f0dad6"
        opacity="0.85"
        transform={`rotate(${(angle * 180) / Math.PI} ${cx + Math.cos(angle) * r * 0.7} ${cy + Math.sin(angle) * r * 0.7})`}
      />,
    );
  }
  return (
    <g>
      {out}
      <circle cx={cx} cy={cy} r={r * 0.4} fill="#b27d80" opacity="0.7" />
    </g>
  );
}
