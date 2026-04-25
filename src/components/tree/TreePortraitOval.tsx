"use client";

import { useState } from "react";

// Oval portrait frame. The only oval surface in the system — see DESIGN.md
// "Layout".
//
// Uses a plain <img> with onError fallback to initials. We want graceful
// degradation when seed portrait files haven't been staged (PRE.3) — the demo
// still reads as a tree of named members, just with monogrammed plates.
export function TreePortraitOval({
  src,
  alt,
  size = "md",
  memorial = false,
}: {
  src?: string;
  alt: string;
  size?: "sm" | "md";
  memorial?: boolean;
}) {
  const dims = size === "sm" ? { w: 80, h: 100 } : { w: 96, h: 120 };
  const [errored, setErrored] = useState(false);
  const showImg = !!src && !errored;
  return (
    <div
      className="relative shrink-0 overflow-hidden border border-divider/60 bg-surface-elevated shadow-[0_1px_0_rgba(0,0,0,0.06)]"
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: "9999px",
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={dims.w}
          height={dims.h}
          onError={() => setErrored(true)}
          className={`absolute inset-0 h-full w-full object-cover ${
            memorial ? "saturate-50 sepia-[.25] opacity-90" : ""
          }`}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-sage-plate/40 text-foliage-deep type-display-m"
        >
          {alt
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
      )}
    </div>
  );
}
