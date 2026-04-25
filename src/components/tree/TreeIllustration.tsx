"use client";

// Painted-tree backdrop. Inline SVG so the demo runs without external assets
// in PRE.4. The visual register: warm-brown trunk growing up the center,
// branches splaying to each generation, sage leaf clusters along them.
//
// Generation Y-positions (in the parent SVG's 0-1000 viewBox space):
//   - Ancestor row:  y ≈ 130
//   - Parent row:    y ≈ 430
//   - Child row:     y ≈ 740
//
// The frontend layout positions DOM nodes over these coordinates so the
// painted backdrop and the node positions align.

export function TreeIllustration() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="bark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a7560" />
          <stop offset="50%" stopColor="#9c8975" />
          <stop offset="100%" stopColor="#8a7560" />
        </linearGradient>
        <radialGradient id="leafCluster" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#9da98c" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#9da98c" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#9da98c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Trunk — narrows as it rises */}
      <path
        d="M 470 1000 C 470 870, 480 700, 490 540 L 510 540 C 520 700, 530 870, 530 1000 Z"
        fill="url(#bark)"
        opacity="0.92"
      />

      {/* Roots — gentle splay at the base */}
      <path
        d="M 470 980 C 380 990, 320 992, 220 988 M 530 980 C 620 990, 680 992, 780 988"
        stroke="#9c8975"
        strokeWidth="3"
        fill="none"
        opacity="0.45"
        strokeLinecap="round"
      />

      {/* Branches to ancestor row (y ≈ 130) */}
      <path
        d="M 500 540 C 500 380, 500 260, 500 150"
        stroke="url(#bark)"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />

      {/* Branches to parent row (y ≈ 430): three splays */}
      <path
        d="M 500 540 C 350 500, 250 470, 200 440"
        stroke="url(#bark)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 500 540 C 650 500, 750 470, 800 440"
        stroke="url(#bark)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Branches to child row (y ≈ 740): two splays */}
      <path
        d="M 500 720 C 400 740, 320 760, 260 770"
        stroke="url(#bark)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 500 720 C 600 740, 680 760, 740 770"
        stroke="url(#bark)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Leaf clusters — soft sage washes near each node position */}
      <ellipse cx="500" cy="170" rx="180" ry="80" fill="url(#leafCluster)" />
      <ellipse cx="220" cy="450" rx="160" ry="80" fill="url(#leafCluster)" />
      <ellipse cx="780" cy="450" rx="160" ry="80" fill="url(#leafCluster)" />
      <ellipse cx="260" cy="780" rx="130" ry="70" fill="url(#leafCluster)" />
      <ellipse cx="740" cy="780" rx="130" ry="70" fill="url(#leafCluster)" />

      {/* A scatter of small leaves for texture */}
      {scatterLeaves()}
    </svg>
  );
}

function scatterLeaves() {
  const seeds: { x: number; y: number; r: number; rot: number }[] = [
    { x: 380, y: 130, r: 6, rot: -25 },
    { x: 620, y: 130, r: 5, rot: 30 },
    { x: 580, y: 240, r: 4, rot: 60 },
    { x: 420, y: 240, r: 4, rot: -50 },
    { x: 280, y: 380, r: 5, rot: -10 },
    { x: 720, y: 380, r: 5, rot: 12 },
    { x: 350, y: 600, r: 4, rot: -40 },
    { x: 650, y: 600, r: 4, rot: 40 },
    { x: 200, y: 720, r: 4, rot: -20 },
    { x: 800, y: 720, r: 4, rot: 20 },
    { x: 480, y: 870, r: 4, rot: -10 },
    { x: 540, y: 880, r: 5, rot: 15 },
  ];
  return (
    <g opacity="0.6">
      {seeds.map((s, i) => (
        <ellipse
          key={i}
          cx={s.x}
          cy={s.y}
          rx={s.r * 1.6}
          ry={s.r * 0.7}
          fill="#9da98c"
          transform={`rotate(${s.rot} ${s.x} ${s.y})`}
        />
      ))}
    </g>
  );
}
