import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import controllerImg from "../assets/controller.png";
import type { MonitorGameHandle } from "./MonitorGame";
import MonitorGame from "./MonitorGame";

// ─── Public handle ────────────────────────────────────────────────────────────
export type ControllerSceneHandle = {
  setProgress: (p: number) => void;
};

// ─── Animation progress breakpoints ──────────────────────────────────────────
const BP = {
  DESCEND_END: 0.20,
  PAUSE_END: 0.30,
  BEAM_FIRE_END: 0.45,
  CORE_FLASH: 0.50,
  UNFOLD_END: 0.65,
  ACTIVE: 0.65,
};

// ─── Easing helpers ──────────────────────────────────────────────────────────
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutExp = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInExp = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const mapRange = (val: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  lerp(outMin, outMax, clamp((val - inMin) / (inMax - inMin), 0, 1));

// ─── Component ────────────────────────────────────────────────────────────────
const ControllerScene = forwardRef<ControllerSceneHandle, { className?: string }>(
  ({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<HTMLDivElement>(null);
    
    // Core & display
    const monitorWrapRef = useRef<HTMLDivElement>(null);
    const monitorInnerRef = useRef<HTMLDivElement>(null);
    const coreRef = useRef<HTMLDivElement>(null);
    const ambientFogRef = useRef<HTMLDivElement>(null);
    
    // SVG Energy Streams
    const streamsRef = useRef<SVGSVGElement>(null);
    const pathRefs = useRef<(SVGPathElement | null)[]>([]);

    const gameRef = useRef<MonitorGameHandle>(null);
    const progressRef = useRef(0);
    const connectedStateRef = useRef(false);
    const rafRef = useRef(0);

    const [phase, setPhase] = useState<"descend" | "pause" | "ignite" | "unfold" | "active">("descend");
    const phaseRef = useRef<"descend" | "pause" | "ignite" | "unfold" | "active">("descend");

    // Button press state (for visual feedback and game steering)
    const [leftPressed, setLeftPressed] = useState(false);
    const [rightPressed, setRightPressed] = useState(false);
    const leftPressedRef = useRef(false);
    const rightPressedRef = useRef(false);
    const steerTiltRef = useRef(0);

    const startLeft = useCallback(() => {
      if (phaseRef.current !== "active") return;
      leftPressedRef.current = true;
      rightPressedRef.current = false;
      setLeftPressed(true);
      setRightPressed(false);
      gameRef.current?.steerLeft(true);
    }, []);

    const startRight = useCallback(() => {
      if (phaseRef.current !== "active") return;
      rightPressedRef.current = true;
      leftPressedRef.current = false;
      setRightPressed(true);
      setLeftPressed(false);
      gameRef.current?.steerRight(true);
    }, []);

    const releaseLeft = useCallback(() => {
      leftPressedRef.current = false;
      setLeftPressed(false);
      gameRef.current?.steerLeft(false);
    }, []);

    const releaseRight = useCallback(() => {
      rightPressedRef.current = false;
      setRightPressed(false);
      gameRef.current?.steerRight(false);
    }, []);

    // ─── RAF render loop ──────────────────────────────────────────────────────
    useEffect(() => {
      let t = 0;

      const tick = () => {
        t += 0.016;
        const p = progressRef.current;
        
        const cam = cameraRef.current;
        const ctrl = controllerRef.current;
        const streams = streamsRef.current;
        const core = coreRef.current;
        const monWrap = monitorWrapRef.current;
        const monInner = monitorInnerRef.current;
        const fog = ambientFogRef.current;

        if (!cam || !ctrl || !streams || !core || !monWrap || !monInner || !fog) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        // ── Phase tracking ────────────────────────────────────────────────────
        let newPhase = phaseRef.current;
        if (p < BP.DESCEND_END) newPhase = "descend";
        else if (p < BP.PAUSE_END) newPhase = "pause";
        else if (p < BP.BEAM_FIRE_END) newPhase = "ignite";
        else if (p < BP.UNFOLD_END) newPhase = "unfold";
        else newPhase = "active";

        if (newPhase !== phaseRef.current) {
          phaseRef.current = newPhase;
          setPhase(newPhase);
          if (newPhase === "active" && !connectedStateRef.current) {
            connectedStateRef.current = true;
            gameRef.current?.boot();
          } else if (newPhase !== "active" && connectedStateRef.current) {
            connectedStateRef.current = false;
            gameRef.current?.toStandby();
          }
        }

        // ── Camera Dolly (Push in slowly) ─────────────────────────────────────
        const camScale = mapRange(p, 0, 1, 1, 1.15);
        const camY = mapRange(p, 0, 1, 0, 40); // slightly push down towards monitor
        cam.style.transform = `scale(${camScale}) translateY(${camY}px)`;

        // ── Ambient Volumetric Fog ────────────────────────────────────────────
        const fogOpacity = mapRange(p, BP.PAUSE_END, BP.UNFOLD_END, 0, 0.8);
        fog.style.opacity = String(fogOpacity);
        // Slowly shifting background
        fog.style.transform = `translateY(${Math.sin(t * 0.5) * 20}px) scale(1.2)`;

        // ── Controller Descent & Transform ────────────────────────────────────
        let ctrlY = 0;
        let ctrlX = 0;
        let ctrlScale = 1;
        let ctrlRotZ = 0;
        let ctrlRotX = 0;
        
        const idleBob = Math.sin(t * 1.8) * 5;
        const targetTilt = leftPressedRef.current ? -1 : rightPressedRef.current ? 1 : 0;
        steerTiltRef.current += (targetTilt - steerTiltRef.current) * 0.14;

        if (p < BP.DESCEND_END) {
          // Descend from center to bottom
          const seg = mapRange(p, 0, BP.DESCEND_END, 0, 1);
          const eased = easeInOutCubic(seg);
          ctrlY = lerp(-400, 0, eased);
          ctrlScale = lerp(0.8, 1, eased);
          ctrlRotZ = lerp(-10, 0, eased);
          ctrlRotX = lerp(-20, 15, eased); // dramatic pitch down to level
        } else if (p < BP.UNFOLD_END) {
          // Pausing and firing: stable with slight idle
          ctrlY = 0;
          ctrlRotX = 15;
          ctrlScale = 1;
        } else {
          // Active play
          const scrollOsc = Math.sin(t * 0.9) * 3;
          const userTilt = steerTiltRef.current * 18; // ±18deg
          ctrlY = 0 + Math.sin(t * 1.5) * 3;
          ctrlX = Math.sin(t * 0.7) * 2 + steerTiltRef.current * 36;
          ctrlRotZ = scrollOsc + userTilt;
          ctrlRotX = 15;
          ctrlScale = 1.05; // slightly engaged
        }

        ctrl.style.transform = `
          translateY(${ctrlY + idleBob}px)
          translateX(${ctrlX}px)
          scale(${ctrlScale})
          rotateZ(${ctrlRotZ}deg)
          rotateX(${ctrlRotX}deg)
        `;

        // Controller Power Pulse
        const ctrlHalo = ctrl.querySelector('.halo-glow') as HTMLElement;
        if (ctrlHalo) {
          if (p < BP.DESCEND_END) {
            ctrlHalo.style.opacity = "0";
            ctrlHalo.style.transform = "scale(0.8)";
          } else if (p < BP.PAUSE_END) {
            // Charging up during pause
            const seg = mapRange(p, BP.DESCEND_END, BP.PAUSE_END, 0, 1);
            ctrlHalo.style.opacity = String(easeInExp(seg) * 0.6);
            ctrlHalo.style.transform = `scale(${lerp(0.8, 1.1, easeInExp(seg))})`;
          } else {
            // Active pulse
            const extra = (leftPressedRef.current || rightPressedRef.current) ? 0.3 : 0;
            ctrlHalo.style.opacity = String(0.6 + Math.sin(t * 8) * 0.1 + extra);
            ctrlHalo.style.transform = `scale(${1.1 + Math.sin(t * 4) * 0.05 + extra * 0.1})`;
          }
        }

        // ── Holographic Energy Streams (Firing up to monitor) ─────────────────
        // Streams appear at PAUSE_END and travel up.
        const streamSeg = mapRange(p, BP.PAUSE_END, BP.BEAM_FIRE_END, 0, 1);
        streams.style.opacity = p > BP.PAUSE_END ? String(Math.min(1, streamSeg * 2)) : "0";
        
        pathRefs.current.forEach((path, i) => {
          if (!path) return;
          const len = 400; // approximate path length
          // Draw the path smoothly
          path.style.strokeDasharray = `${len}`;
          path.style.strokeDashoffset = String(len * (1 - easeOutExp(streamSeg)));
          
          // Once fully drawn, add an endless flowing data effect
          if (streamSeg > 0.9) {
            path.style.strokeDasharray = `${len * 0.2} ${len * 0.1}`;
            path.style.strokeDashoffset = String(-t * 150 * (i % 2 === 0 ? 1 : 1.2));
            path.style.opacity = String(0.6 + Math.sin(t * (3 + i)) * 0.3);
          } else {
            path.style.opacity = "1";
          }
        });

        // ── Energy Core Expansion ─────────────────────────────────────────────
        const coreSeg = mapRange(p, BP.BEAM_FIRE_END, BP.CORE_FLASH, 0, 1);
        if (p >= BP.BEAM_FIRE_END && p < BP.UNFOLD_END) {
          core.style.opacity = String(easeInOutCubic(coreSeg));
          core.style.transform = `scale(${lerp(0, 3, easeOutExp(coreSeg))})`;
          core.style.filter = `blur(${lerp(5, 20, coreSeg)}px)`;
        } else {
          core.style.opacity = "0";
        }

        // ── Holographic Monitor Unfold ────────────────────────────────────────
        const unfoldSeg = mapRange(p, BP.CORE_FLASH, BP.UNFOLD_END, 0, 1);
        const easedUnfold = easeOutExp(unfoldSeg);
        
        if (p < BP.CORE_FLASH) {
          monWrap.style.opacity = "0";
          monWrap.style.transform = "rotateX(90deg) scale(0.4)";
          monWrap.style.filter = "blur(10px)";
        } else {
          monWrap.style.opacity = String(easedUnfold);
          monWrap.style.transform = `rotateX(${lerp(90, 0, easedUnfold)}deg) scale(${lerp(0.4, 1, easedUnfold)})`;
          monWrap.style.filter = `blur(${lerp(10, 0, easedUnfold)}px)`;
        }

        // Monitor volumetric bloom
        const btnBoost = (leftPressedRef.current || rightPressedRef.current) ? 0.3 : 0;
        if (p > BP.CORE_FLASH) {
          monInner.style.boxShadow = `
            0 0 ${lerp(0, 40, easedUnfold)}px rgba(0,229,255,${0.4 + btnBoost}),
            0 0 ${lerp(0, 100, easedUnfold)}px rgba(0,229,255,${0.2 + btnBoost}),
            0 40px 100px -20px rgba(0,229,255,0.15)
          `;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, []);

    useImperativeHandle(ref, () => ({
      setProgress: (p: number) => {
        progressRef.current = clamp(p, 0, 1);
      },
    }));

    const isInteractive = phase === "active";

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative", width: "100%", height: "100%",
          overflow: "hidden", perspective: "1500px",
        }}
      >
        {/* ── Camera Dolly Wrapper ────────────────────────────────────────── */}
        <div
          ref={cameraRef}
          style={{
            position: "absolute", inset: 0,
            transformOrigin: "50% 30%", // Push in towards the monitor
            willChange: "transform",
            transformStyle: "preserve-3d",
          }}
        >
          {/* ── Volumetric Fog Background ─────────────────────────────────── */}
          <div
            ref={ambientFogRef}
            aria-hidden
            style={{
              position: "absolute", inset: "-20%",
              background: "radial-gradient(ellipse at 50% 30%, rgba(0,229,255,0.08) 0%, rgba(124,58,237,0.03) 40%, transparent 70%)",
              filter: "blur(40px)",
              mixBlendMode: "screen",
              pointerEvents: "none", zIndex: 1,
            }}
          />

          {/* ── Holographic Energy Streams (SVG) ──────────────────────────── */}
          <svg
            ref={streamsRef}
            aria-hidden
            style={{
              position: "absolute", left: "50%", bottom: "5%",
              transform: "translateX(-50%) translateZ(-50px)",
              width: "300px", height: "65%",
              overflow: "visible", zIndex: 10,
              pointerEvents: "none",
              filter: "drop-shadow(0 0 8px rgba(0,229,255,0.8)) drop-shadow(0 0 16px rgba(124,58,237,0.5))",
            }}
            viewBox="0 0 300 400"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="cs-stream-grad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="20%" stopColor="#00e5ff" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.8" />
                <stop offset="90%" stopColor="#00e5ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>
            {/* Multiple organic paths connecting from the USB-C port (150, 290) to the monitor (150, 0) */}
            {[
              "M 150 290 C 150 200, 150 100, 150 0", // center straight
              "M 150 290 C 100 200, 120 100, 150 0", // left weave
              "M 150 290 C 200 200, 180 100, 150 0", // right weave
              "M 150 290 C 50  200, 140 100, 150 0", // wide left
              "M 150 290 C 250 200, 160 100, 150 0", // wide right
            ].map((d, i) => (
              <path
                key={i}
                ref={(el) => (pathRefs.current[i] = el)}
                d={d}
                stroke="url(#cs-stream-grad)"
                strokeWidth={i === 0 ? "4" : "2"}
                fill="none"
                strokeLinecap="round"
                style={{ mixBlendMode: "screen" }}
              />
            ))}
          </svg>

          {/* ── Holographic Particles (Data Packets) ──────────────────────── */}
          {phase !== "descend" && phase !== "pause" && (
            <div aria-hidden style={{ position: "absolute", left: "50%", bottom: "5%", width: "200px", height: "65%", marginLeft: "-100px", pointerEvents: "none", zIndex: 12 }}>
              {[...Array(12)].map((_, i) => (
                <div
                  key={`p-${i}`}
                  style={{
                    position: "absolute",
                    left: "50%", bottom: "0%", // start at USB port
                    width: `${2 + Math.random() * 3}px`, height: `${4 + Math.random() * 8}px`,
                    borderRadius: "50%", background: i % 2 === 0 ? "#00e5ff" : "#7c3aed",
                    boxShadow: `0 0 8px ${i % 2 === 0 ? "#00e5ff" : "#7c3aed"}`,
                    animation: `cs-data-packet ${1 + Math.random() * 1.5}s ${Math.random() * 2}s infinite cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Energy Core (Expanding Flash) ─────────────────────────────── */}
          <div
            ref={coreRef}
            aria-hidden
            style={{
              position: "absolute", left: "50%", top: "clamp(220px, 22%, 300px)",
              marginTop: "120px", marginLeft: "-40px",
              width: "80px", height: "80px", borderRadius: "50%",
              background: "radial-gradient(circle, #ffffff 0%, #00e5ff 40%, transparent 100%)",
              mixBlendMode: "screen", zIndex: 15,
              opacity: 0, pointerEvents: "none",
            }}
          />

          {/* ── Holographic Display (Monitor) ─────────────────────────────── */}
          <div
            ref={monitorWrapRef}
            style={{
              position: "absolute", top: "clamp(220px, 22%, 300px)", left: "50%",
              marginLeft: "calc(-1 * min(240px, 34vw))",
              width: "min(480px, 68vw)", zIndex: 20,
              transformStyle: "preserve-3d", transformOrigin: "50% 100%",
            }}
          >
            <div
              ref={monitorInnerRef}
              style={{
                position: "relative", aspectRatio: "560 / 360",
                transition: "box-shadow 0.1s linear",
                borderRadius: "14px",
              }}
            >
              {/* Restored Bezel SVG (with transparent hole in the middle) */}
              <svg viewBox="0 0 560 360" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 5, pointerEvents: "none" }}>
                <defs>
                  <linearGradient id="cs-bezel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1a26" />
                    <stop offset="100%" stopColor="#08080d" />
                  </linearGradient>
                  <filter id="cs-bezel-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Frame with a cutout hole for the screen */}
                <path 
                  d="M0,14 C0,6 6,0 14,0 L546,0 C554,0 560,6 560,14 L560,346 C560,354 554,360 546,360 L14,360 C6,360 0,354 0,346 Z M22,14 L538,14 C542,14 546,18 546,22 L546,338 C546,342 542,346 538,346 L22,346 C18,346 14,342 14,338 L14,22 C14,18 18,14 22,14 Z" 
                  fill="url(#cs-bezel)" 
                  fillRule="evenodd" 
                  stroke="#00e5ff" 
                  strokeWidth="1" 
                  strokeOpacity="0.3" 
                  filter="url(#cs-bezel-glow)" 
                />
                {/* Screen border line */}
                <rect x="14" y="14" width="532" height="322" rx="8" fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.6" />
                {/* Base / Stand attached to bottom */}
                <path d="M 230 360 L 330 360 L 340 380 L 220 380 Z" fill="#1a1a26" />
                <rect x="200" y="380" width="160" height="8" rx="4" fill="#08080d" stroke="#00e5ff" strokeWidth="0.5" strokeOpacity="0.2" />
              </svg>

              {/* Screen Content Area (Perfectly aligned inside the 14px padding) */}
              <div style={{ position: "absolute", top: "14px", left: "14px", right: "14px", bottom: "24px", overflow: "hidden", borderRadius: "8px", background: "#0a0c14", zIndex: 1 }}>
                {/* Internal Hologram Scanlines & UI grid */}
                <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(0deg, transparent 50%, rgba(0,229,255,0.03) 50%)", backgroundSize: "100% 4px", zIndex: 3, pointerEvents: "none" }} />
                <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 3, pointerEvents: "none" }} />
                
                {/* Game Canvas */}
                <MonitorGame ref={gameRef} style={{ width: "100%", height: "100%", display: "block", position: "relative", zIndex: 2 }} />
              </div>
            </div>
            {/* Holographic Stand Base */}
            <div aria-hidden style={{ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", width: "40%", height: "20px", background: "linear-gradient(to bottom, rgba(0,229,255,0.2), transparent)", clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0 100%)", opacity: 0.6 }} />
          </div>

          {/* ── Controller & Interaction ──────────────────────────────────── */}
          <div
            ref={controllerRef}
            style={{
              position: "absolute",
              bottom: "5%", left: "50%",
              marginLeft: "-160px",
              width: "320px",
              transformStyle: "preserve-3d",
              transformOrigin: "50% 50%",
              zIndex: 30, willChange: "transform",
            }}
          >
            {/* High-fidelity volumetric halo */}
            <div
              className="halo-glow"
              aria-hidden
              style={{
                position: "absolute", inset: "-40px", borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(0,229,255,0.4) 0%, rgba(124,58,237,0.15) 40%, transparent 100%)",
                filter: "blur(24px)", mixBlendMode: "screen", pointerEvents: "none",
                willChange: "transform, opacity",
              }}
            />

            <img
              src={controllerImg}
              alt="TIMKOLAS Pro controller"
              draggable={false}
              style={{
                width: "100%", display: "block", userSelect: "none",
                filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.8)) drop-shadow(0 0 20px rgba(0,229,255,0.2))",
                pointerEvents: "none", position: "relative", zIndex: 2,
              }}
            />

            {/* LEFT JOYSTICK */}
            <div
              role="button" aria-label="Steer left"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startLeft(); }}
              onPointerUp={releaseLeft} onPointerCancel={releaseLeft} onPointerLeave={releaseLeft}
              style={{
                position: "absolute", left: "14%", top: "38%", width: "22%", height: "28%", borderRadius: "50%",
                cursor: isInteractive ? "pointer" : "default", zIndex: 10, touchAction: "none",
                boxShadow: leftPressed ? "0 0 0 2px rgba(0,229,255,0.8), 0 0 30px rgba(0,229,255,0.6)" : isInteractive ? "0 0 0 1px rgba(0,229,255,0.3)" : "none",
                background: leftPressed ? "radial-gradient(circle, rgba(0,229,255,0.3) 0%, transparent 70%)" : "transparent",
                transition: "all 0.1s ease",
              }}
            />

            {/* RIGHT JOYSTICK */}
            <div
              role="button" aria-label="Steer right"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startRight(); }}
              onPointerUp={releaseRight} onPointerCancel={releaseRight} onPointerLeave={releaseRight}
              style={{
                position: "absolute", right: "14%", top: "50%", width: "22%", height: "28%", borderRadius: "50%",
                cursor: isInteractive ? "pointer" : "default", zIndex: 10, touchAction: "none",
                boxShadow: rightPressed ? "0 0 0 2px rgba(255,62,165,0.8), 0 0 30px rgba(255,62,165,0.6)" : isInteractive ? "0 0 0 1px rgba(255,62,165,0.3)" : "none",
                background: rightPressed ? "radial-gradient(circle, rgba(255,62,165,0.3) 0%, transparent 70%)" : "transparent",
                transition: "all 0.1s ease",
              }}
            />

            {/* Subtle floating particles emitted from controller (active phase) */}
            {isInteractive && (
              <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute", left: `${30 + Math.random() * 40}%`, top: "20%",
                      width: "3px", height: "3px", borderRadius: "50%", background: "#00e5ff",
                      boxShadow: "0 0 6px #00e5ff",
                      animation: `cs-float-up ${1.5 + Math.random()}s ${Math.random()}s infinite ease-in`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes cs-float-up {
            0% { transform: translateY(0) scale(1); opacity: 0.8; }
            100% { transform: translateY(-100px) scale(0); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }
);

ControllerScene.displayName = "ControllerScene";
export default ControllerScene;
