import { useCallback, useEffect, useRef } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AnalogStickProps {
  /** CSS left% position of the stick centre within the parent */
  cx: number;
  /** CSS top% position of the stick centre within the parent */
  cy: number;
  /** Diameter of the outer static ring as % of the parent width */
  sizePct: number;
  /**
   * How far the drag indicator travels relative to the ring's radius.
   * 1.0 = full radius, 0.9 = 90%. Always passed explicitly.
   */
  travelPct: number;
  /** Colour used for the ring glow on drag */
  ringColor: string;
  /** Whether the stick is interactive (active phase) */
  interactive: boolean;
  /** Called with normalised dx,dy [-1..1] while dragging */
  onSteer?: (dx: number, dy: number) => void;
  /** Called when the stick is released */
  onRelease?: () => void;
}

// ─── Elastic spring easing ───────────────────────────────────────────────────
function easeOutElastic(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * AnalogStick renders NO visible knob of its own.
 * The controller base image already has the sticks drawn.
 *
 * What this component adds on top:
 *   1. Outer glow ring  — static, glows brighter when pressed
 *   2. Drag dot         — small translucent circle that moves to show deflection
 *   3. Invisible hit zone — full ring area captures pointer events
 */
export default function AnalogStick({
  cx,
  cy,
  sizePct,
  travelPct,
  ringColor,
  interactive,
  onSteer,
  onRelease,
}: AnalogStickProps) {
  // The glow ring (stays fixed)
  const ringRef = useRef<HTMLDivElement>(null);
  // The small drag-dot (moves to show deflection, sits on top of the real stick)
  const dotRef = useRef<HTMLDivElement>(null);
  // Invisible hit zone (same size as ring)
  const hitRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef({ x: 0, y: 0, active: false, pointerId: -1 });
  const springRef = useRef({ startX: 0, startY: 0, startTime: 0 });
  const rafRef = useRef(0);

  // ── Imperative visual update ──────────────────────────────────────────────
  const applyVisuals = useCallback((ox: number, oy: number, isPressed: boolean) => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring) return;

    const ringRadius = ring.offsetWidth / 2;
    const maxTravel = ringRadius * travelPct;

    const dist = Math.sqrt(ox * ox + oy * oy);
    const clampedDist = Math.min(dist, maxTravel);
    const normX = dist > 0 ? ox / dist : 0;
    const normY = dist > 0 ? oy / dist : 0;
    const tx = normX * clampedDist;
    const ty = normY * clampedDist;
    const tNorm = maxTravel > 0 ? clampedDist / maxTravel : 0;

    // ── Glow ring (outer static) ────────────────────────────────────────────
    if (isPressed) {
      ring.style.boxShadow = `
        inset 0 0 0 2px ${ringColor}cc,
        0 0 ${12 + tNorm * 20}px ${ringColor}99,
        0 0 ${24 + tNorm * 32}px ${ringColor}44
      `;
      ring.style.background = `radial-gradient(circle, ${ringColor}1a 0%, transparent 70%)`;
    } else {
      ring.style.boxShadow = interactive
        ? `inset 0 0 0 1.5px ${ringColor}55, 0 0 6px ${ringColor}22`
        : "none";
      ring.style.background = "transparent";
    }

    // ── Drag dot (moves with the stick deflection) ──────────────────────────
    if (dot) {
      if (isPressed && tNorm > 0.05) {
        dot.style.opacity = String(0.4 + tNorm * 0.5);
        dot.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${0.6 + tNorm * 0.5})`;
      } else {
        dot.style.opacity = "0";
        dot.style.transform = "translate(-50%, -50%) scale(0.6)";
      }
    }
  }, [ringColor, travelPct, interactive]);

  // ── Elastic spring-back ───────────────────────────────────────────────────
  const springBack = useCallback((fromX: number, fromY: number) => {
    cancelAnimationFrame(rafRef.current);
    springRef.current = { startX: fromX, startY: fromY, startTime: performance.now() };
    const DURATION = 420;

    const tick = (now: number) => {
      const t = Math.min((now - springRef.current.startTime) / DURATION, 1);
      const e = easeOutElastic(t);
      const ox = springRef.current.startX * (1 - e);
      const oy = springRef.current.startY * (1 - e);
      applyVisuals(ox, oy, false);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else applyVisuals(0, 0, false);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyVisuals]);

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: 0, y: 0, active: true, pointerId: e.pointerId };
    cancelAnimationFrame(rafRef.current);
    applyVisuals(0, 0, true);
  }, [interactive, applyVisuals]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return;
    const ring = ringRef.current;
    if (!ring) return;

    const rect = ring.getBoundingClientRect();
    const ox = e.clientX - (rect.left + rect.width / 2);
    const oy = e.clientY - (rect.top + rect.height / 2);
    dragRef.current.x = ox;
    dragRef.current.y = oy;

    applyVisuals(ox, oy, true);

    const ringRadius = ring.offsetWidth / 2;
    const maxTravel = ringRadius * travelPct;
    const dist = Math.sqrt(ox * ox + oy * oy);
    const normX = dist > 0 ? ox / dist : 0;
    const normY = dist > 0 ? oy / dist : 0;
    onSteer?.(normX * Math.min(dist / maxTravel, 1), normY * Math.min(dist / maxTravel, 1));
  }, [applyVisuals, onSteer, travelPct]);

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const { x, y } = dragRef.current;
    dragRef.current.active = false;
    onRelease?.();
    springBack(x, y);
  }, [onRelease, springBack]);

  // Sync idle ring glow with interactive flag
  useEffect(() => {
    applyVisuals(0, 0, false);
  }, [interactive, applyVisuals]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    /* Positioning anchor — centred on (cx, cy), no pointer events */
    <div
      style={{
        position: "absolute",
        left: `${cx}%`,
        top: `${cy}%`,
        width: `${sizePct}%`,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {/* ── STATIC GLOW RING (never moves, just glows) ─────────────────── */}
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          transition: "box-shadow 0.18s ease, background 0.18s ease",
          pointerEvents: "none",
        }}
      />

      {/* ── DRAG DOT (small indicator that shows deflection direction) ──── */}
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "28%",
          height: "28%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ringColor}cc 0%, ${ringColor}44 60%, transparent 100%)`,
          transform: "translate(-50%, -50%) scale(0.6)",
          opacity: 0,
          transition: "opacity 0.08s ease",
          pointerEvents: "none",
          willChange: "transform, opacity",
          filter: `blur(1px)`,
          mixBlendMode: "screen",
        }}
      />

      {/* ── INVISIBLE HIT ZONE (captures all pointer events) ───────────── */}
      <div
        ref={hitRef}
        role="button"
        aria-label="Analog stick"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          cursor: interactive ? "grab" : "default",
          touchAction: "none",
          pointerEvents: interactive ? "all" : "none",
          background: "transparent",
        }}
      />
    </div>
  );
}
