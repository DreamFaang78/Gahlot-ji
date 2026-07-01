import { useCallback, useEffect, useRef, useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AnalogStickProps {
  /** CSS left% position of the stick centre within the parent */
  cx: number;
  /** CSS top% position of the stick centre within the parent */
  cy: number;
  /** Diameter of the interactive/ring zone as % of the parent width */
  sizePct: number;
  /**
   * How far the knob translates relative to its own radius when dragged to the edge.
   * 1.0 = full radius, 0.9 = 90% of radius. Passed explicitly — never defaults
   * to a stale value.
   */
  travelPct: number;
  /** Colour used for the ring glow and shadow on drag */
  ringColor: string;
  /** Whether the stick is interactive (active phase) */
  interactive: boolean;
  /** Called when the stick is engaged (pressed + dragged) */
  onSteer?: (dx: number, dy: number) => void;
  /** Called when the stick is released */
  onRelease?: () => void;
  /** Extra CSS class */
  className?: string;
}

// ─── Elastic spring easing (overshoot then settle) ───────────────────────────
function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
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
  const ringRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Raw knob offset in px (relative to ring centre)
  const dragRef = useRef({ x: 0, y: 0, active: false, pointerId: -1 });
  // Spring animation state
  const springRef = useRef({ startX: 0, startY: 0, startTime: 0, animating: false });
  const rafRef = useRef(0);

  const [pressed, setPressed] = useState(false);

  // ── Apply visual state directly to DOM for perf ──────────────────────────
  const applyKnob = useCallback((ox: number, oy: number, isPressed: boolean) => {
    const knob = knobRef.current;
    const ring = ringRef.current;
    if (!knob || !ring) return;

    const radius = ring.offsetWidth / 2;
    const maxTravel = radius * travelPct;
    const dist = Math.sqrt(ox * ox + oy * oy);
    const clampedDist = Math.min(dist, maxTravel);
    const normX = dist > 0 ? ox / dist : 0;
    const normY = dist > 0 ? oy / dist : 0;
    const cx2 = normX * clampedDist;
    const cy2 = normY * clampedDist;

    // Tilt: rotateX (pitch) and rotateY (yaw) — max ±20deg
    const tiltX = -(cy2 / maxTravel) * 20;
    const tiltY = (cx2 / maxTravel) * 20;

    // Scale: compress slightly on push
    const scale = isPressed ? 0.88 - (clampedDist / maxTravel) * 0.06 : 1;

    // Drop-shadow: shifts opposite to drag direction (light stays fixed)
    const shadowX = -(cx2 / maxTravel) * 6;
    const shadowY = -(cy2 / maxTravel) * 6;
    const shadowBlur = isPressed ? 12 + (clampedDist / maxTravel) * 10 : 6;
    const shadowAlpha = isPressed ? 0.7 : 0.4;

    knob.style.transform = `
      translate(${cx2}px, ${cy2}px)
      rotateX(${tiltX}deg)
      rotateY(${tiltY}deg)
      scale(${scale})
    `;
    knob.style.filter = `drop-shadow(${shadowX}px ${shadowY + 4}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`;

    // Ring glow
    const glowIntensity = clampedDist / maxTravel;
    if (isPressed) {
      ring.style.boxShadow = `
        0 0 0 2px ${ringColor}cc,
        0 0 ${12 + glowIntensity * 20}px ${ringColor}99,
        0 0 ${20 + glowIntensity * 30}px ${ringColor}44
      `;
      ring.style.background = `radial-gradient(circle, ${ringColor}33 0%, transparent 70%)`;
    } else {
      ring.style.boxShadow = interactive ? `0 0 0 1px ${ringColor}66` : "none";
      ring.style.background = "transparent";
    }
  }, [ringColor, travelPct, interactive]);

  // ── Spring-back animation ─────────────────────────────────────────────────
  const springBack = useCallback((fromX: number, fromY: number) => {
    cancelAnimationFrame(rafRef.current);
    springRef.current = { startX: fromX, startY: fromY, startTime: performance.now(), animating: true };

    const DURATION = 420; // ms

    const tick = (now: number) => {
      const t = Math.min((now - springRef.current.startTime) / DURATION, 1);
      const e = easeOutElastic(t);
      const ox = springRef.current.startX * (1 - e);
      const oy = springRef.current.startY * (1 - e);
      applyKnob(ox, oy, false);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        springRef.current.animating = false;
        applyKnob(0, 0, false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyKnob]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: 0, y: 0, active: true, pointerId: e.pointerId };
    setPressed(true);
    applyKnob(0, 0, true);
  }, [interactive, applyKnob]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return;
    const ring = ringRef.current;
    if (!ring) return;

    const rect = ring.getBoundingClientRect();
    const ox = e.clientX - (rect.left + rect.width / 2);
    const oy = e.clientY - (rect.top + rect.height / 2);
    dragRef.current.x = ox;
    dragRef.current.y = oy;

    const radius = ring.offsetWidth / 2;
    const maxTravel = radius * travelPct;
    const dist = Math.sqrt(ox * ox + oy * oy);
    const normX = dist > 0 ? ox / dist : 0;
    const normY = dist > 0 ? oy / dist : 0;

    applyKnob(ox, oy, true);
    onSteer?.(normX * Math.min(dist / maxTravel, 1), normY * Math.min(dist / maxTravel, 1));
  }, [applyKnob, onSteer, travelPct]);

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const { x, y } = dragRef.current;
    dragRef.current.active = false;
    setPressed(false);
    onRelease?.();
    springBack(x, y);
  }, [onRelease, springBack]);

  // Update ring glow when interactive state changes without drag
  useEffect(() => {
    if (!pressed) applyKnob(0, 0, false);
  }, [interactive, pressed, applyKnob]);

  // Cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div
      ref={ringRef}
      role="button"
      aria-label="Analog stick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        // Centre the div on cx/cy using a negative margin trick
        left: `${cx}%`,
        top: `${cy}%`,
        width: `${sizePct}%`,
        // Height = width (square → circle) via aspect-ratio
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        cursor: interactive ? "grab" : "default",
        zIndex: 10,
        touchAction: "none",
        transition: "box-shadow 0.15s ease, background 0.15s ease",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Knob — visually the stick top */}
      <div
        ref={knobRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: "15%",
          borderRadius: "50%",
          background: `radial-gradient(circle at 38% 35%, #4a4a55, #1a1a20)`,
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.08), inset 0 -2px 4px rgba(0,0,0,0.6)",
          transformStyle: "preserve-3d",
          willChange: "transform, filter",
          transition: "none", // all motion handled imperatively
          pointerEvents: "none",
        }}
      >
        {/* Grip texture — subtle cross pattern */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "20%",
            borderRadius: "50%",
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px),
              radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "4px 4px, 4px 4px",
            backgroundPosition: "0 0, 2px 2px",
          }}
        />
        {/* Top specular highlight */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "12%", left: "20%",
            width: "40%", height: "30%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, transparent 100%)",
            transform: "rotate(-20deg)",
          }}
        />
      </div>
    </div>
  );
}
