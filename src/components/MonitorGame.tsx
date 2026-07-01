import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type MonitorGameHandle = {
  boot: () => void;
  toStandby: () => void;
  /** Steer the ship left (true = pressing, false = release) */
  steerLeft: (pressed: boolean) => void;
  /** Steer the ship right (true = pressing, false = release) */
  steerRight: (pressed: boolean) => void;
  /** 0–1 intensity for active phase special effects */
  setActiveIntensity?: (v: number) => void;
};

/**
 * Enhanced Synthwave racer — three distinct visual states:
 *   standby   → dark idle, pulsing "STANDBY – SCROLL TO CONNECT"
 *   boot      → terminal-style init sequence
 *   play      → full neon racer with speed, score, combo, blocks
 *
 * Exposed via ref: boot() / toStandby() / setActiveIntensity(0-1)
 */
const MonitorGame = forwardRef<MonitorGameHandle, { className?: string; style?: React.CSSProperties }>(
  ({ className, style }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const apiRef = useRef<MonitorGameHandle | null>(null);

    useEffect(() => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let W = 0, H = 0, dpr = 1;
      let mode: "standby" | "boot" | "play" = "play";
      let t = 0, bootStart = 0;
      let activeIntensity = 0; // externally driven 0–1

      // Game state
      let score = 0, speed = 240, combo = 1;
      const obstacles: { z: number; lane: number; hue: number; judged?: boolean }[] = [];
      const stars: { x: number; y: number; s: number }[] = [];
      const parts: { x: number; y: number; vx: number; vy: number; life: number; hue: number }[] = [];
      const collectibles: { x: number; y: number; life: number; hue: number }[] = [];

      const input = { left: false, right: false };
      const player = { x: 0, vx: 0 };
      let attract = true;
      let lastInputAt = 0;
      let firstInput = false;
      let flash = 0;
      const shake = { x: 0, y: 0, t: 0 };

      const markInput = () => { attract = false; firstInput = true; lastInputAt = performance.now(); };
      const checkIdle = () => { if (!attract && performance.now() - lastInputAt > 4000) { attract = true; input.left = input.right = false; } };

      const onKeyDown = (e: KeyboardEvent) => {
        if (mode === "standby") return;
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") { input.left = true; markInput(); e.preventDefault(); }
        else if (k === "ArrowRight" || k === "d" || k === "D") { input.right = true; markInput(); e.preventDefault(); }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") input.left = false;
        else if (k === "ArrowRight" || k === "d" || k === "D") input.right = false;
      };
      const poEnd = () => { input.left = false; input.right = false; };
      const onPointerDown = (e: PointerEvent) => {
        if (mode === "standby") return;
        const r = cv.getBoundingClientRect();
        const dir = e.clientX - r.left < r.width / 2 ? -1 : 1;
        if (dir < 0) { input.left = true; input.right = false; } else { input.right = true; input.left = false; }
        markInput();
      };

      cv.style.touchAction = "manipulation";
      window.addEventListener("keydown", onKeyDown, { passive: false });
      window.addEventListener("keyup", onKeyUp);
      cv.addEventListener("pointerdown", onPointerDown);
      cv.addEventListener("pointerup", poEnd);
      cv.addEventListener("pointercancel", poEnd);
      cv.addEventListener("pointerleave", poEnd);

      const resize = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        const r = cv.getBoundingClientRect();
        W = r.width || 488; H = r.height || 258;
        cv.width = W * dpr; cv.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (stars.length === 0) {
          for (let i = 0; i < 60; i++)
            stars.push({ x: Math.random(), y: Math.random() * 0.42, s: Math.random() * 1.6 + 0.3 });
        }
      };
      const ro = new ResizeObserver(resize);
      ro.observe(cv);
      resize();

      const spawn = () => {
        obstacles.push({
          z: 1,
          lane: (Math.random() * 2 - 1) * 0.8,
          hue: [180, 300, 150, 40, 210, 270][(Math.random() * 6) | 0],
        });
      };

      const roadX = (lane: number, z: number) => {
        const persp = 0.18 + (1 - z) * 0.82;
        return W / 2 + lane * (W * 0.42) * persp;
      };
      const roadY = (z: number) => {
        const hY = H * 0.42;
        return hY + (H - hY) * (1 - z);
      };

      // ─── Scene — shared background ─────────────────────────────────────────
      function drawScene(speedMult = 1) {
        const hY = H * 0.42;

        // Sky gradient
        const g = ctx!.createLinearGradient(0, 0, 0, hY);
        g.addColorStop(0, "#040412");
        g.addColorStop(0.5, "#1a0830");
        g.addColorStop(1, "#3a0f4a");
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, W, hY);

        // Stars — twinkle
        stars.forEach((s) => {
          const tw = 0.4 + 0.6 * Math.sin(t * 2.5 + s.x * 18 + s.y * 9);
          ctx!.globalAlpha = tw * 0.85;
          ctx!.fillStyle = "#fff";
          ctx!.fillRect(s.x * W, s.y * H, s.s, s.s);
        });
        ctx!.globalAlpha = 1;

        // Synthwave sun / horizon bloom
        const sr = H * 0.24, sx = W / 2, sy = hY - 1;
        const sg = ctx!.createLinearGradient(0, sy - sr, 0, sy);
        sg.addColorStop(0, "#ff3ea5");
        sg.addColorStop(0.45, "#ff8a1e");
        sg.addColorStop(1, "#ffd34d");
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(sx, sy, sr, Math.PI, 0);
        ctx!.clip();
        ctx!.fillStyle = sg;
        ctx!.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        // Sun scanlines
        ctx!.fillStyle = "#040412";
        const scanSpeed = 7 * speedMult;
        for (let i = 0; i < 8; i++) {
          const gy = sy - sr * 0.58 + i * 8 + ((t * scanSpeed) % 8);
          ctx!.fillRect(sx - sr, gy, sr * 2, 3.5 + i * 0.5);
        }
        ctx!.restore();

        // Horizon glow
        const hg = ctx!.createLinearGradient(0, hY - 8, 0, hY + 12);
        hg.addColorStop(0, "rgba(255,62,165,0.55)");
        hg.addColorStop(1, "rgba(0,229,255,0.0)");
        ctx!.fillStyle = hg;
        ctx!.fillRect(0, hY - 8, W, 20);

        // Road floor
        ctx!.fillStyle = "#030309";
        ctx!.fillRect(0, hY, W, H - hY);

        // Road grid lines (horizontal) — speed-reactive
        ctx!.strokeStyle = "rgba(0,229,255,.18)";
        ctx!.lineWidth = 1;
        const off = (t * 0.55 * speedMult) % 1;
        for (let i = 0; i < 18; i++) {
          const z = (i + off) / 18;
          const y = roadY(z);
          ctx!.globalAlpha = z * 0.9;
          ctx!.beginPath();
          ctx!.moveTo(0, y);
          ctx!.lineTo(W, y);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;

        // Road edge lines — neon cyan glow
        ctx!.save();
        ctx!.shadowColor = "#00e5ff";
        ctx!.shadowBlur = 16 + 8 * Math.sin(t * 3);
        ctx!.lineWidth = 2.5;
        ctx!.strokeStyle = "rgba(0,229,255,.9)";
        [-1, 1].forEach((s) => {
          ctx!.beginPath();
          ctx!.moveTo(roadX(s, 1), roadY(1));
          ctx!.lineTo(roadX(s, 0), roadY(0));
          ctx!.stroke();
        });
        ctx!.restore();

        // Centre dashes
        ctx!.strokeStyle = "rgba(255,255,255,.45)";
        for (let i = 0; i < 12; i++) {
          const z1 = (i + off) / 12, z2 = z1 + 0.04;
          if (z2 > 1) continue;
          ctx!.lineWidth = 1 + (1 - z1) * 3;
          ctx!.beginPath();
          ctx!.moveTo(W / 2, roadY(z1));
          ctx!.lineTo(W / 2, roadY(z2));
          ctx!.globalAlpha = z1;
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      // ─── Obstacles / blocks ────────────────────────────────────────────────
      function drawObstacles() {
        obstacles.forEach((o) => {
          const y = roadY(o.z), x = roadX(o.lane, o.z);
          const w = W * 0.16 * (0.2 + (1 - o.z));
          const hgt = w * 0.55;
          ctx!.save();
          ctx!.shadowColor = `hsl(${o.hue},100%,60%)`;
          ctx!.shadowBlur = 22;
          ctx!.strokeStyle = `hsl(${o.hue},100%,65%)`;
          ctx!.lineWidth = 2 + (1 - o.z) * 2;
          ctx!.strokeRect(x - w / 2, y - hgt, w, hgt);
          ctx!.fillStyle = `hsla(${o.hue},100%,55%,.12)`;
          ctx!.fillRect(x - w / 2, y - hgt, w, hgt);
          // Scanline on block face
          ctx!.fillStyle = `hsla(${o.hue},100%,80%,.18)`;
          ctx!.fillRect(x - w / 2 + 2, y - hgt + 4, w - 4, 2);
          ctx!.restore();
        });
      }

      // ─── Player ship ───────────────────────────────────────────────────────
      function drawPlayer() {
        const px = W / 2 + player.x * W * 0.16, py = H * 0.9;
        const roll = attract ? Math.sin(t * 1.3) * 0.2 : player.vx * 1.8;

        // Exhaust trail
        if (Math.random() < 0.85) {
          parts.push({
            x: px + (Math.random() * 10 - 5),
            y: py + 8,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 1.5 + Math.random(),
            life: 1,
            hue: Math.random() < 0.5 ? 190 : 300,
          });
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life -= 0.05;
          p.x += p.vx;
          p.y += p.vy;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          ctx!.globalAlpha = p.life * 0.8;
          ctx!.fillStyle = `hsl(${p.hue},100%,65%)`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;

        // Ship body
        ctx!.save();
        ctx!.translate(px, py);
        ctx!.rotate(roll);
        ctx!.shadowColor = "#00e5ff";
        ctx!.shadowBlur = 24;
        const grd = ctx!.createLinearGradient(0, -16, 0, 12);
        grd.addColorStop(0, "#ffffff");
        grd.addColorStop(0.5, "#a0f0ff");
        grd.addColorStop(1, "#00e5ff");
        ctx!.fillStyle = grd;
        ctx!.beginPath();
        ctx!.moveTo(0, -18);
        ctx!.lineTo(14, 14);
        ctx!.lineTo(0, 6);
        ctx!.lineTo(-14, 14);
        ctx!.closePath();
        ctx!.fill();
        // Wing accent lines
        ctx!.strokeStyle = "rgba(0,229,255,0.7)";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(-6, 8); ctx!.lineTo(-14, 14);
        ctx!.moveTo(6, 8); ctx!.lineTo(14, 14);
        ctx!.stroke();
        ctx!.restore();
      }

      // ─── HUD ───────────────────────────────────────────────────────────────
      function drawHUD(speedMult = 1) {
        const fSize = Math.max(9, W * 0.026);
        ctx!.font = `700 ${fSize}px 'JetBrains Mono',monospace`;
        ctx!.textBaseline = "top";

        // Score
        ctx!.fillStyle = "rgba(0,229,255,.95)";
        ctx!.textAlign = "left";
        ctx!.fillText("SCORE " + String(score | 0).padStart(7, "0"), W * 0.04, H * 0.05);

        // Speed — reacts to speedMult
        const displaySpeed = ((speed * (1 + activeIntensity * 0.5)) | 0);
        ctx!.textAlign = "right";
        ctx!.fillStyle = displaySpeed > 300 ? "#ff3ea5" : "rgba(0,229,255,.95)";
        ctx!.fillText(displaySpeed + " KM/H", W * 0.96, H * 0.05);

        ctx!.textAlign = "left";

        // Energy bar
        const bw = W * 0.28, bx = W * 0.04, by = H * 0.14;
        ctx!.fillStyle = "rgba(255,255,255,.1)";
        ctx!.fillRect(bx, by, bw, 4);
        const energy = 0.5 + 0.5 * Math.sin(t * 2 * speedMult);
        const barColor = activeIntensity > 0.5 ? "#ff3ea5" : "#39ff88";
        ctx!.fillStyle = barColor;
        ctx!.fillRect(bx, by, bw * energy, 4);

        // Combo
        const comboSize = Math.max(8, W * 0.022);
        ctx!.font = `700 ${comboSize}px 'JetBrains Mono'`;
        ctx!.fillStyle = `rgba(57,255,136,.9)`;
        ctx!.fillText(`x${combo.toFixed(1)} COMBO`, bx, by + 8);

        // Active: "MAX SPEED" flash overlay
        if (activeIntensity > 0.7) {
          const alpha = (activeIntensity - 0.7) * (0.5 + 0.5 * Math.sin(t * 8));
          ctx!.globalAlpha = alpha;
          ctx!.fillStyle = "#ff3ea5";
          ctx!.textAlign = "center";
          ctx!.font = `700 ${Math.max(10, W * 0.03)}px 'JetBrains Mono'`;
          ctx!.fillText("MAX SPEED", W / 2, H * 0.08);
          ctx!.textAlign = "left";
          ctx!.globalAlpha = 1;
        }
      }

      // ─── Standby screen ────────────────────────────────────────────────────
      function drawStandby() {
        // Deep dark
        ctx!.fillStyle = "#04060c";
        ctx!.fillRect(0, 0, W, H);

        // Dim scene underneath
        ctx!.globalAlpha = 0.35 + 0.1 * Math.sin(t * 0.8);
        drawScene(0.3);
        ctx!.globalAlpha = 1;

        // Overlay
        ctx!.fillStyle = "rgba(4,6,12,0.55)";
        ctx!.fillRect(0, 0, W, H);

        // Pulsing title
        const a = 0.35 + 0.35 * Math.sin(t * 1.6);
        ctx!.globalAlpha = a;
        ctx!.fillStyle = "#fff";
        ctx!.textAlign = "center";
        ctx!.font = `400 ${Math.max(14, W * 0.075)}px 'Michroma'`;
        ctx!.fillText("TIMKOLAS", W / 2, H * 0.38);

        ctx!.globalAlpha = 0.55;
        ctx!.font = `500 ${Math.max(8, W * 0.022)}px 'JetBrains Mono'`;
        ctx!.fillText("● STANDBY — SCROLL TO CONNECT", W / 2, H * 0.55);

        // Cyan scan lines sweeping down
        for (let i = 0; i < 3; i++) {
          const scanY = ((t * 40 + i * (H / 3)) % H);
          ctx!.globalAlpha = 0.12;
          ctx!.fillStyle = "#00e5ff";
          ctx!.fillRect(0, scanY, W, 1.5);
        }

        ctx!.globalAlpha = 1;
        ctx!.textAlign = "left";
      }

      // ─── Boot sequence ─────────────────────────────────────────────────────
      function drawBoot() {
        drawScene(0.5);
        drawObstacles();
        drawPlayer();

        ctx!.fillStyle = "rgba(4,6,12,.82)";
        ctx!.fillRect(0, 0, W, H);

        const el = (performance.now() - bootStart) / 1000;
        const lines = [
          "◢ TIMKOLAS LINK ESTABLISHED",
          "INITIALIZING NEURAL CORE...",
          "LOADING TRACK: NEON DRIVE",
          "CALIBRATING RGB MATRIX...",
          "SYNCING CONTROLLER INPUT...",
          "● READY — LET'S PLAY",
        ];
        const fSize = Math.max(9, W * 0.026);
        ctx!.textBaseline = "top";
        ctx!.textAlign = "left";
        ctx!.font = `700 ${fSize}px 'JetBrains Mono'`;

        const n = Math.min(lines.length, Math.floor(el / 0.22) + 1);
        for (let i = 0; i < n; i++) {
          const blink = i === n - 1 ? 0.5 + 0.5 * Math.sin(t * 10) : 1;
          ctx!.globalAlpha = blink;
          ctx!.fillStyle = i === lines.length - 1 ? "#39ff88" : i % 2 === 0 ? "#00e5ff" : "rgba(0,229,255,0.75)";
          ctx!.fillText(lines[i], W * 0.08, H * 0.25 + i * H * 0.09);
        }
        ctx!.globalAlpha = 1;
        ctx!.textAlign = "left";

        if (el > 1.4) mode = "play";
      }

      // ─── Physics step ──────────────────────────────────────────────────────
      function step() {
        const speedMult = 1 + activeIntensity * 0.6;
        speed = (230 + Math.sin(t * 0.5) * 40) * speedMult;
        score += speed * 0.016 * combo * 0.1;

        const spawnRate = 0.025 + activeIntensity * 0.02;
        if (Math.random() < spawnRate) spawn();

        if (attract) {
          const target = Math.sin(t * 1.3);
          player.vx = (target - player.x) * 0.12;
          player.x += player.vx;
        } else {
          const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
          player.vx += dir * 0.04;
          player.vx *= 0.86;
          player.x = Math.max(-1, Math.min(1, player.x + player.vx));
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const o = obstacles[i];
          const prevZ = o.z;
          o.z -= (0.012 + activeIntensity * 0.008) * speedMult;
          if (prevZ >= 0.12 && o.z < 0.12 && !o.judged) {
            o.judged = true;
            if (Math.abs(o.lane - player.x) < 0.28) {
              combo = 1; flash = 1;
              if (!reduce) shake.t = 0.15;
            } else {
              score += 250 * combo;
              combo = Math.min(9.9, combo + 0.25);
              // Spawn collectible burst
              for (let j = 0; j < 4; j++) {
                collectibles.push({
                  x: roadX(o.lane, 0.1) + (Math.random() - 0.5) * 30,
                  y: roadY(0.1) - Math.random() * 20,
                  life: 1,
                  hue: o.hue,
                });
              }
            }
          }
          if (o.z <= 0) obstacles.splice(i, 1);
        }

        // Tick collectible bursts
        for (let i = collectibles.length - 1; i >= 0; i--) {
          collectibles[i].life -= 0.04;
          if (collectibles[i].life <= 0) { collectibles.splice(i, 1); continue; }
          const c = collectibles[i];
          ctx!.globalAlpha = c.life;
          ctx!.fillStyle = `hsl(${c.hue},100%,65%)`;
          ctx!.beginPath();
          ctx!.arc(c.x, c.y - (1 - c.life) * 30, 3 * c.life, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = 1;
        }

        checkIdle();
        if (flash > 0) flash = Math.max(0, flash - 0.04);
        if (shake.t > 0) {
          shake.t -= 0.016; shake.x = (Math.random() - 0.5) * 8; shake.y = (Math.random() - 0.5) * 8;
        } else { shake.x = 0; shake.y = 0; }
      }

      // ─── Main render loop ──────────────────────────────────────────────────
      let raf = 0;
      function loop() {
        t += 0.016;
        ctx!.clearRect(0, 0, W, H);
        ctx!.save();
        if (shake.x || shake.y) ctx!.translate(shake.x, shake.y);

        if (mode === "standby") {
          drawStandby();
        } else if (mode === "boot") {
          drawBoot();
        } else {
          const speedMult = 1 + activeIntensity * 0.6;
          step();
          drawScene(speedMult);
          drawObstacles();
          drawPlayer();
          drawHUD(speedMult);

          // Attract overlay
          if (attract && !firstInput) {
            ctx!.globalAlpha = 0.5 + 0.35 * Math.sin(t * 3);
            ctx!.fillStyle = "#fff";
            ctx!.textAlign = "center";
            ctx!.font = `700 ${Math.max(10, W * 0.028)}px 'JetBrains Mono'`;
            ctx!.fillText("◂ ▸ STEER  /  TAP TO PLAY", W / 2, H * 0.8);
            ctx!.globalAlpha = 1;
            ctx!.textAlign = "left";
          }

          // Hit flash — radial red
          if (flash > 0) {
            const vg = ctx!.createRadialGradient(W / 2, H * 0.9, W * 0.08, W / 2, H * 0.5, Math.max(W, H));
            vg.addColorStop(0, `rgba(255,40,80,${flash * 0.6})`);
            vg.addColorStop(1, "rgba(255,40,80,0)");
            ctx!.fillStyle = vg;
            ctx!.fillRect(0, 0, W, H);
          }

          // Active intensity vignette glow
          if (activeIntensity > 0) {
            const vg2 = ctx!.createRadialGradient(W / 2, H, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
            vg2.addColorStop(0, `rgba(124,58,237,${activeIntensity * 0.15})`);
            vg2.addColorStop(1, "rgba(0,0,0,0)");
            ctx!.fillStyle = vg2;
            ctx!.fillRect(0, 0, W, H);
          }
        }

        ctx!.restore();
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);

      // ─── API ──────────────────────────────────────────────────────────────
      apiRef.current = {
        boot() {
          if (mode === "play" || mode === "boot") return;
          if (reduce) { mode = "play"; return; }
          mode = "boot";
          bootStart = performance.now();
        },
        toStandby() {
          mode = "standby";
          obstacles.length = 0;
          collectibles.length = 0;
          parts.length = 0;
          attract = true; firstInput = false;
          input.left = input.right = false;
          player.x = 0; player.vx = 0;
          flash = 0; shake.t = 0; shake.x = 0; shake.y = 0;
          score = 0; combo = 1;
          activeIntensity = 0;
        },
        setActiveIntensity(v: number) {
          activeIntensity = Math.max(0, Math.min(1, v));
        },
        steerLeft(pressed: boolean) {
          if (mode === "standby") return;
          input.left = pressed;
          if (pressed) { input.right = false; markInput(); }
        },
        steerRight(pressed: boolean) {
          if (mode === "standby") return;
          input.right = pressed;
          if (pressed) { input.left = false; markInput(); }
        },
      };

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        cv.removeEventListener("pointerdown", onPointerDown);
        cv.removeEventListener("pointerup", poEnd);
        cv.removeEventListener("pointercancel", poEnd);
        cv.removeEventListener("pointerleave", poEnd);
        apiRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      boot: () => apiRef.current?.boot(),
      toStandby: () => apiRef.current?.toStandby(),
      setActiveIntensity: (v: number) => apiRef.current?.setActiveIntensity?.(v),
      steerLeft: (pressed: boolean) => apiRef.current?.steerLeft(pressed),
      steerRight: (pressed: boolean) => apiRef.current?.steerRight(pressed),
    }), []);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width: "100%", height: "100%", display: "block", ...style }}
      />
    );
  }
);

MonitorGame.displayName = "MonitorGame";
export default MonitorGame;
