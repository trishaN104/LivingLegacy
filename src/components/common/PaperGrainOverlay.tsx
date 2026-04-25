// Subtle SVG noise wash above the page background. The closest thing to a
// shadow this system has — see DESIGN.md "Elevation & Depth".
export function PaperGrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 mix-blend-multiply opacity-[0.06]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.34  0 0 0 0 0.27  0 0 0 0 0.18  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: "240px 240px",
      }}
    />
  );
}
