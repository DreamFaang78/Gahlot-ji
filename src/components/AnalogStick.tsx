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
   * How far the knob translates relative to the ring's radius when dragged to the edge.
   * 1.0 = full radius, 0.9 = 90% of radius. Always passed explicitly.
   */
  travelPct: number;
  /** Colour used for the ring glow and shadow on drag */
  ringColor: string;
  /** Whether the stick is interactive (active phase) */
  interactive: boolean;
  /** Called with normalised dx,dy [-1..1] while dragging */
  onSteer?: (dx: number, dy: number) => void;
  /** Called when the stick is released */
  onRelease?: () => void;
}

// ─── Elastic spring easing (overshoot then settle) ───────────────────────────
function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ─── Component ────────────────────────────────────────────────────────────────
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
  // Outer static ring (boundary + glow)
  const ringRef = useRef<HTMLDivElement>(null);
  // Inner dynamic knob (the part that moves)
  const knobRef = useRef<HTMLDivElement>(null);
  // Invisible wide drag-capture zone (centred on ring, same size as ring)
  const hitRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef({ x: 0, y: 0, active: false, pointerId: -1 });
  const springRef = useRef({ startX: 0, startY: 0, startTime: 0 });
  const rafRef = useRef(0);

  // ── Core visual update — called imperatively every frame ──────────────────
  const applyKnob = useCallback((ox: number, oy: number, isPressed: boolean) => {
    const knob = knobRef.current;
    const ring = ringRef.current;
    if (!knob || !ring) return;

    // Max travel = ring radius × travelPct
    const ringRadius = ring.offsetWidth / 2;
    const maxTravel = ringRadius * travelPct;

    // Clamp offset to the travel circle
    const dist = Math.sqrt(ox * ox + oy * oy);
    const clampedDist = Math.min(dist, maxTravel);
    const normX = dist > 0 ? ox / dist : 0;
    const normY = dist > 0 ? oy / dist : 0;
    const tx = normX * clampedDist;
    const ty = normY * clampedDist;
    const tNorm = maxTravel > 0 ? clampedDist / maxTravel : 0; // 0..1

    // ── Knob 3-D tilt: rotateX (pitch), rotateY (yaw) — max ±22 deg
    const tiltX = -(ty / maxTravel || 0) * 22;
    const tiltY = (tx / maxTravel || 0) * 22;

    // ── Scale: squash on press, deeper with travel
    const scale = isPressed ? 0.86 - tNorm * 0.07 : 1;

    // ── Drop-shadow: shifts OPPOSITE drag (light source is fixed above-left)
    const shadowX = -tx / (maxTravel || 1) * 7;
    const shadowY = -ty / (maxTravel || 1) * 7;
    const shadowBlur = isPressed ? 14 + tNorm * 12 : 7;
    const shadowAlpha = isPressed ? 0.75 : 0.45;

    // Apply to knob
    knob.style.transform = `
      translate(${tx}px, ${ty}px)
      rotateX(${tiltX}deg)
      rotateY(${tiltY}deg)
      scale(${scale})
    `;
    knob.style.filter =
      `drop-shadow(${shadowX}px ${shadowY + 4}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`;

    // ── Ring glow (outer static circle reacts but doesn't move)
    if (isPressed) {
      ring.style.boxShadow = `
        inset 0 0 0 2px ${ringColor}bb,
        0 0 ${10 + tNorm * 18}px ${ringColor}88,
        0 0 ${22 + tNorm * 28}px ${ringColor}44
      `;
      ring.style.background = `radial-gradient(circle, ${ringColor}22 0%, transparent 70%)`;
    } else {
      ring.style.boxShadow = interactive
        ? `inset 0 0 0 1.5px ${ringColor}55, 0 0 8px ${ringColor}22`
        : "none";
      ring.style.background = "transparent";
    }
  }, [ringColor, travelPct, interactive]);

  // ── Elastic spring-back ───────────────────────────────────────────────────
  const springBack = useCallback((fromX: number, fromY: number) => {
    cancelAnimationFrame(rafRef.current);
    springRef.current = { startX: fromX, startY: fromY, startTime: performance.now() };
    const DURATION = 440;

    const tick = (now: number) => {
      const t = Math.min((now - springRef.current.startTime) / DURATION, 1);
      const e = easeOutElastic(t);
      const ox = springRef.current.startX * (1 - e);
      const oy = springRef.current.startY * (1 - e);
      applyKnob(ox, oy, false);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else applyKnob(0, 0, false);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyKnob]);

  // ── Pointer handlers — attached to the invisible hit zone ─────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: 0, y: 0, active: true, pointerId: e.pointerId };
    cancelAnimationFrame(rafRef.current);
    applyKnob(0, 0, true);
  }, [interactive, applyKnob]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return;
    const ring = ringRef.current;
    if (!ring) return;

    // Measure offset from the ring's centre
    const rect = ring.getBoundingClientRect();
    const ox = e.clientX - (rect.left + rect.width / 2);
    const oy = e.clientY - (rect.top + rect.height / 2);
    dragRef.current.x = ox;
    dragRef.current.y = oy;

    applyKnob(ox, oy, true);

    // Fire onSteer with normalised [-1..1] values
    const ringRadius = ring.offsetWidth / 2;
    const maxTravel = ringRadius * travelPct;
    const dist = Math.sqrt(ox * ox + oy * oy);
    const normX = dist > 0 ? ox / dist : 0;
    const normY = dist > 0 ? oy / dist : 0;
    onSteer?.(normX * Math.min(dist / maxTravel, 1), normY * Math.min(dist / maxTravel, 1));
  }, [applyKnob, onSteer, travelPct]);

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const { x, y } = dragRef.current;
    dragRef.current.active = false;
    onRelease?.();
    springBack(x, y);
  }, [onRelease, springBack]);

  // Re-apply idle ring glow when interactive flag changes
  useEffect(() => {
    applyKnob(0, 0, false);
  }, [interactive, applyKnob]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    /**
     * Wrapper — centred on (cx, cy) via transform: translate(-50%,-50%).
     * No pointer events here — just a positioning anchor.
     */
    <div
      style={{
        position: "absolute",
        left: `${cx}%`,
        top: `${cy}%`,
        width: `${sizePct}%`,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
        transformStyle: "preserve-3d",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {/* ── OUTER STATIC RING ─────────────────────────────────────────────── */}
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          // Background & boxShadow driven imperatively by applyKnob
          transition: "box-shadow 0.18s ease, background 0.18s ease",
          pointerEvents: "none",
        }}
      />

      {/* ── DYNAMIC KNOB (inner circle — the part that moves) ─────────────── */}
      <div
        ref={knobRef}
        aria-hidden
        style={{
          // Centred inside the ring, sized at 58% of ring diameter
          position: "absolute",
          top: "50%", left: "50%",
          width: "58%", height: "58%",
          transform: "translate(-50%, -50%)", // default centred; overridden imperatively
          borderRadius: "50%",
          // Dark rubberized look matching real analog sticks
          background: "radial-gradient(circle at 38% 32%, #56565f, #1c1c22)",
          boxShadow: "inset 0 2px 5px rgba(255,255,255,0.10), inset 0 -3px 6px rgba(0,0,0,0.65)",
          transformStyle: "preserve-3d",
          willChange: "transform, filter",
          pointerEvents: "none",
        }}
      >
        {/* Grip texture dots */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "15%",
            borderRadius: "50%",
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px),
              radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "4px 4px, 4px 4px",
            backgroundPosition: "0 0, 2px 2px",
          }}
        />
        {/* Specular highlight — shifts with tilt in CSS for a cheap 3-D feel */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "10%", left: "18%",
            width: "44%", height: "34%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.20) 0%, transparent 100%)",
            transform: "rotate(-18deg)",
          }}
        />
      </div>

      {/* ── INVISIBLE HIT ZONE — same size as the outer ring, captures all drags ── */}
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
          // Debug: set background to red temporarily to visualise hit zone
          background: "transparent",
        }}
      />
    </div>
  );
}
