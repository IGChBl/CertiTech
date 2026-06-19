"use client";

import { useEffect, useRef } from "react";

const TILE_W = 120;
const TILE_H = 80;

const TILE_TRIS: [number, number][][] = [
  [[0, 0], [0, 40], [30, 0]],
  [[0, 40], [30, 0], [60, 40]],
  [[30, 0], [60, 40], [90, 0]],
  [[60, 40], [90, 0], [120, 40]],
  [[90, 0], [120, 0], [120, 40]],
  [[0, 40], [30, 80], [0, 80]],
  [[0, 40], [30, 80], [60, 40]],
  [[30, 80], [60, 40], [90, 80]],
  [[60, 40], [90, 80], [120, 40]],
  [[90, 80], [120, 40], [120, 80]],
];

const PALETTE = [
  "#03060d", "#04080f", "#06101e", "#080d18",
  "#0a1828", "#0c1530", "#0f1e38", "#0d2840",
  "#0d3d35", "#155c50", "#17897A", "#1B2340",
  "#1AA090", "#1dbaa8", "#2BBFAA",
];

const REF_W = 1920;
const REF_H = 1080;

function pickColor(cx: number, cy: number, seed: number): string {
  const t = (cx / REF_W) * 0.65 + (cy / REF_H) * 0.35;
  const noise = (((seed * 1301 + 7919) % 97) / 97) * 0.14 - 0.07;
  const idx = Math.round(
    Math.max(0, Math.min(1, t + noise)) * (PALETTE.length - 1)
  );
  return PALETTE[idx];
}

interface Tri {
  id: string;
  points: string;
  fill: string;
  cx: number;
  cy: number;
}

function buildTris(): Tri[] {
  const tris: Tri[] = [];
  const tilesX = Math.ceil(REF_W / TILE_W) + 1;
  const tilesY = Math.ceil(REF_H / TILE_H) + 1;

  for (let tj = 0; tj < tilesY; tj++) {
    for (let ti = 0; ti < tilesX; ti++) {
      const ox = ti * TILE_W;
      const oy = tj * TILE_H;
      TILE_TRIS.forEach((pts, i) => {
        const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3 + ox;
        const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3 + oy;
        tris.push({
          id: `${ti}-${tj}-${i}`,
          points: pts.map(([px, py]) => `${ox + px},${oy + py}`).join(" "),
          fill: pickColor(cx, cy, ti * 100 + tj * 10 + i),
          cx,
          cy,
        });
      });
    }
  }
  return tris;
}

const TRIS = buildTris();

// Radius in SVG user-space units within which triangles lift
const HOVER_RADIUS = 180;
const MAX_LIFT = 22;

export function TriangleBackground() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const polys = Array.from(svg.querySelectorAll<SVGPolygonElement>(".ct-poly"));
    const n = polys.length;

    // Current and target lift values per triangle (avoid allocations in the loop)
    const current = new Float32Array(n);
    const target = new Float32Array(n);

    let mx = -9999;
    let my = -9999;
    let rafId = 0;

    // Lerp factor per frame — controls how fast triangles follow the cursor.
    // Lower = smoother but more lag; 0.18 feels fluid without delay.
    const LERP = 0.18;

    function tick() {
      rafId = requestAnimationFrame(tick);

      // Recompute targets for current cursor position
      for (let i = 0; i < n; i++) {
        const { cx, cy } = TRIS[i];
        const dx = cx - mx;
        const dy = cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        target[i] = dist < HOVER_RADIUS
          ? MAX_LIFT * (1 - dist / HOVER_RADIUS) ** 2
          : 0;
      }

      // Lerp current → target and apply to DOM
      for (let i = 0; i < n; i++) {
        const prev = current[i];
        const next = prev + (target[i] - prev) * LERP;
        current[i] = next;

        if (next > 0.2) {
          const t = next / MAX_LIFT;
          polys[i].style.transform = `translateY(${-next}px) scale(${1 + 0.1 * t})`;
          polys[i].style.filter = `brightness(${1 + 0.5 * t}) saturate(${1 + 0.35 * t})`;
        } else if (prev > 0.2) {
          // Only clear style when crossing the threshold (avoids constant DOM writes)
          polys[i].style.transform = "";
          polys[i].style.filter = "";
          current[i] = 0;
        }
      }
    }

    function onMove(e: MouseEvent) {
      const rect = svg!.getBoundingClientRect();
      mx = ((e.clientX - rect.left) / rect.width) * REF_W;
      my = ((e.clientY - rect.top) / rect.height) * REF_H;
    }

    function onLeave() {
      mx = -9999;
      my = -9999;
    }

    rafId = requestAnimationFrame(tick);
    svg.addEventListener("mousemove", onMove);
    svg.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(rafId);
      svg.removeEventListener("mousemove", onMove);
      svg.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      {/* Base gradient — visible through the gaps when triangles lift */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, #020609 0%, #071220 30%, #071e1a 60%, #0d1830 100%)",
        }}
      />

      {/* Frost / escarcha layer — SVG turbulence noise en ice-blue */}
      <svg
        aria-hidden
        className="absolute inset-0 z-0 h-full w-full opacity-[0.18]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="frost-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75 0.55"
              numOctaves="4"
              seed="8"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.65  0 0 0 0 0.92  0 0 0 0 1  0 0 0 0.6 0"
            />
          </filter>
          {/* Radial vignette para concentrar el efecto escarcha al centro */}
          <radialGradient id="frost-fade" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="frost-mask">
            <rect width="100%" height="100%" fill="url(#frost-fade)" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          filter="url(#frost-noise)"
          mask="url(#frost-mask)"
        />
      </svg>

      {/* Triangle tessellation — interactive, sits above the frost */}
      <svg
        ref={svgRef}
        aria-hidden
        viewBox={`0 0 ${REF_W} ${REF_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 z-10 h-full w-full"
        style={{ display: "block" }}
      >
        <style>{`
          .ct-poly {
            transform-box: fill-box;
            transform-origin: center;
            will-change: transform, filter;
          }
        `}</style>
        {TRIS.map((tri) => (
          <polygon
            key={tri.id}
            className="ct-poly"
            points={tri.points}
            fill={tri.fill}
          />
        ))}
      </svg>
    </>
  );
}
