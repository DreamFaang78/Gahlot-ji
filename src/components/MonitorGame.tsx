import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type MonitorGameHandle = {
  boot: () => void;
  toStandby: () => void;
};

/**
 * Synthwave racer canvas ported from public/timkolas_scroll_demo_v2.html.
 * Self-contained; expose boot()/toStandby() via ref. Steering is enabled
 * once the game has booted (mode !== 'standby').
 */
const MonitorGame = forwardRef<MonitorGameHandle, { className?: string }>(
  ({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const apiRef = useRef<MonitorGameHandle | null>(null);

    useEffect(() => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let W = 0, H = 0, dpr = 1;
      let mode: "standby" | "boot" | "play" = "standby";
      let t = 0, bootStart = 0;
      let score = 0, speed = 240, combo = 1;
      const obstacles: { z: number; lane: number; hue: number; judged?: boolean }[] = [];
      const stars: { x: number; y: number; s: number }[] = [];
      const parts: { x: number; y: number; life: number; hue: number }[] = [];

      const input = { left: false, right: false };
      const player = { x: 0, vx: 0 };
      let attract = true;
      let lastInputAt = 0;
      let firstInput = false;
      let flash = 0;
      const shake = { x: 0, y: 0, t: 0 };

      const markInput = () => {
        attract = false;
        firstInput = true;
        lastInputAt = performance.now();
      };
      const checkIdle = () => {
        if (!attract && performance.now() - lastInputAt > 4000) {
          attract = true;
          input.left = input.right = false;
        }
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (mode === "standby") return;
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") {
          input.left = true; markInput(); e.preventDefault();
        } else if (k === "ArrowRight" || k === "d" || k === "D") {
          input.right = true; markInput(); e.preventDefault();
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") input.left = false;
        else if (k === "ArrowRight" || k === "d" || k === "D") input.right = false;
      };
      const poStart = (dir: number) => {
        if (dir < 0) { input.left = true; input.right = false; }
        else { input.right = true; input.left = false; }
        markInput();
      };
      const poEnd = () => { input.left = false; input.right = false; };
      const onPointerDown = (e: PointerEvent) => {
        if (mode === "standby") return;
        const r = cv.getBoundingClientRect();
        poStart(e.clientX - r.left < r.width / 2 ? -1 : 1);
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
          for (let i = 0; i < 40; i++)
            stars.push({ x: Math.random(), y: Math.random() * 0.42, s: Math.random() * 1.4 + 0.3 });
        }
      };
      const ro = new ResizeObserver(resize);
      ro.observe(cv);
      resize();

      const spawn = () => obstacles.push({
        z: 1,
        lane: (Math.random() * 2 - 1) * 0.8,
        hue: [180, 300, 150, 40, 210][(Math.random() * 5) | 0],
      });
      const roadX = (lane: number, z: number) => {
        const persp = 0.18 + (1 - z) * 0.82;
        return W / 2 + lane * (W * 0.42) * persp;
      };
      const roadY = (z: number) => {
        const hY = H * 0.42;
        return hY + (H - hY) * (1 - z);
      };

      function drawScene() {
        const hY = H * 0.42;
        const g = ctx!.createLinearGradient(0, 0, 0, hY);
        g.addColorStop(0, "#070716"); g.addColorStop(1, "#3a0f4a");
        ctx!.fillStyle = g; ctx!.fillRect(0, 0, W, hY);
        ctx!.fillStyle = "rgba(255,255,255,.8)";
        stars.forEach((s) => {
          const tw = 0.5 + 0.5 * Math.sin(t * 3 + s.x * 20);
          ctx!.globalAlpha = tw * 0.8;
          ctx!.fillRect(s.x * W, s.y * H, s.s, s.s);
        });
        ctx!.globalAlpha = 1;
        const sr = H * 0.22, sx = W / 2, sy = hY - 2;
        const sg = ctx!.createLinearGradient(0, sy - sr, 0, sy);
        sg.addColorStop(0, "#ff3ea5"); sg.addColorStop(0.5, "#ff8a1e"); sg.addColorStop(1, "#ffd34d");
        ctx!.save(); ctx!.beginPath(); ctx!.arc(sx, sy, sr, Math.PI, 0); ctx!.clip();
        ctx!.fillStyle = sg; ctx!.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        ctx!.fillStyle = "#070716";
        for (let i = 0; i < 7; i++) {
          const gy = sy - sr * 0.55 + i * 7 + ((t * 14) % 7);
          ctx!.fillRect(sx - sr, gy, sr * 2, 3 + i * 0.6);
        }
        ctx!.restore();
        ctx!.fillStyle = "#05050d"; ctx!.fillRect(0, hY, W, H - hY);
        ctx!.strokeStyle = "rgba(0,229,255,.22)"; ctx!.lineWidth = 1;
        const off = (t * 0.6) % 1;
        for (let i = 0; i < 14; i++) {
          const z = (i + off) / 14; const y = roadY(z);
          ctx!.globalAlpha = z * 0.9;
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(W, y); ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
        ctx!.save(); ctx!.shadowColor = "#00e5ff"; ctx!.shadowBlur = 14; ctx!.lineWidth = 3;
        ctx!.strokeStyle = "rgba(0,229,255,.9)";
        [-1, 1].forEach((s) => {
          ctx!.beginPath();
          ctx!.moveTo(roadX(s, 1), roadY(1));
          ctx!.lineTo(roadX(s, 0), roadY(0));
          ctx!.stroke();
        });
        ctx!.restore();
        ctx!.strokeStyle = "rgba(255,255,255,.5)";
        for (let i = 0; i < 10; i++) {
          const z1 = (i + off) / 10, z2 = z1 + 0.04;
          if (z2 > 1) continue;
          ctx!.lineWidth = 1 + (1 - z1) * 3;
          ctx!.beginPath();
          ctx!.moveTo(W / 2, roadY(z1)); ctx!.lineTo(W / 2, roadY(z2));
          ctx!.globalAlpha = z1; ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      function drawObstacles() {
        obstacles.forEach((o) => {
          const y = roadY(o.z), x = roadX(o.lane, o.z), w = W * 0.16 * (0.2 + (1 - o.z));
          const hgt = w * 0.5;
          ctx!.save();
          ctx!.shadowColor = `hsl(${o.hue},100%,60%)`;
          ctx!.shadowBlur = 18;
          ctx!.strokeStyle = `hsl(${o.hue},100%,62%)`;
          ctx!.lineWidth = 2 + (1 - o.z) * 2;
          ctx!.strokeRect(x - w / 2, y - hgt, w, hgt);
          ctx!.fillStyle = `hsla(${o.hue},100%,60%,.12)`;
          ctx!.fillRect(x - w / 2, y - hgt, w, hgt);
          ctx!.restore();
        });
      }

      function drawPlayer() {
        const px = W / 2 + player.x * W * 0.16, py = H * 0.9;
        const roll = attract ? Math.sin(t * 1.3) * 0.18 : player.vx * 1.8;
        if (Math.random() < 0.8)
          parts.push({ x: px + (Math.random() * 8 - 4), y: py + 6, life: 1, hue: Math.random() < 0.5 ? 190 : 300 });
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.life -= 0.06; p.y += 2;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          ctx!.globalAlpha = p.life;
          ctx!.fillStyle = `hsl(${p.hue},100%,60%)`;
          ctx!.fillRect(p.x, p.y, 2.5, 2.5);
        }
        ctx!.globalAlpha = 1;
        ctx!.save(); ctx!.translate(px, py); ctx!.rotate(roll);
        ctx!.shadowColor = "#00e5ff"; ctx!.shadowBlur = 20;
        const grd = ctx!.createLinearGradient(0, -14, 0, 10);
        grd.addColorStop(0, "#fff"); grd.addColorStop(1, "#00e5ff");
        ctx!.fillStyle = grd;
        ctx!.beginPath();
        ctx!.moveTo(0, -16); ctx!.lineTo(13, 12); ctx!.lineTo(0, 5); ctx!.lineTo(-13, 12); ctx!.closePath();
        ctx!.fill();
        ctx!.restore();
      }

      function drawHUD() {
        ctx!.font = "700 " + Math.max(9, W * 0.026) + "px 'JetBrains Mono',monospace";
        ctx!.fillStyle = "rgba(0,229,255,.95)"; ctx!.textBaseline = "top";
        ctx!.fillText("SCORE " + String(score | 0).padStart(7, "0"), W * 0.04, H * 0.05);
        ctx!.textAlign = "right"; ctx!.fillStyle = "rgba(0,229,255,.95)";
        ctx!.fillText((speed | 0) + " KM/H", W * 0.96, H * 0.05);
        ctx!.textAlign = "left";
        const bw = W * 0.3, bx = W * 0.04, by = H * 0.13;
        ctx!.fillStyle = "rgba(255,255,255,.12)"; ctx!.fillRect(bx, by, bw, 5);
        ctx!.fillStyle = "#39ff88"; ctx!.fillRect(bx, by, bw * (Math.sin(t * 2) * 0.5 + 0.5), 5);
        ctx!.fillStyle = "rgba(57,255,136,.9)";
        ctx!.font = "700 " + Math.max(8, W * 0.02) + "px 'JetBrains Mono'";
        ctx!.fillText("x" + combo.toFixed(1) + " COMBO", bx, by + 9);
      }

      function drawStandby() {
        ctx!.fillStyle = "#04060c"; ctx!.fillRect(0, 0, W, H);
        drawScene();
        const a = 0.4 + 0.4 * Math.sin(t * 2);
        ctx!.globalAlpha = a; ctx!.fillStyle = "#fff"; ctx!.textAlign = "center";
        ctx!.font = "400 " + Math.max(14, W * 0.075) + "px 'Michroma'";
        ctx!.fillText("TIMKOLAS", W / 2, H * 0.4);
        ctx!.globalAlpha = 0.6;
        ctx!.font = "500 " + Math.max(8, W * 0.022) + "px 'JetBrains Mono'";
        ctx!.fillText("● STANDBY — SCROLL TO CONNECT", W / 2, H * 0.56);
        ctx!.globalAlpha = 1; ctx!.textAlign = "left";
      }

      function drawBoot() {
        drawScene(); drawObstacles(); drawPlayer();
        ctx!.fillStyle = "rgba(4,6,12,.78)"; ctx!.fillRect(0, 0, W, H);
        const el = (performance.now() - bootStart) / 1000;
        const lines = ["◢ TIMKOLAS LINK ESTABLISHED", "INITIALIZING GPU CORE...", "LOADING TRACK: NEON DRIVE", "CALIBRATING RGB...", "● READY"];
        ctx!.fillStyle = "#00e5ff"; ctx!.textAlign = "left"; ctx!.textBaseline = "top";
        ctx!.font = "700 " + Math.max(9, W * 0.026) + "px 'JetBrains Mono'";
        const n = Math.min(lines.length, Math.floor(el / 0.26) + 1);
        for (let i = 0; i < n; i++) {
          ctx!.globalAlpha = i === n - 1 ? 0.5 + 0.5 * Math.sin(t * 8) : 1;
          ctx!.fillStyle = i === lines.length - 1 ? "#39ff88" : "#00e5ff";
          ctx!.fillText(lines[i], W * 0.08, H * 0.3 + i * H * 0.09);
        }
        ctx!.globalAlpha = 1; ctx!.textAlign = "left";
        if (el > 1.5) mode = "play";
      }

      function step() {
        speed = 230 + Math.sin(t * 0.5) * 40;
        score += speed * 0.016 * combo * 0.1;
        if (Math.random() < 0.03) spawn();
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
          o.z -= 0.012;
          if (prevZ >= 0.12 && o.z < 0.12 && !o.judged) {
            o.judged = true;
            if (Math.abs(o.lane - player.x) < 0.28) {
              combo = 1; flash = 1; if (!reduce) shake.t = 0.15;
            } else {
              score += 250 * combo;
              combo = Math.min(9.9, combo + 0.25);
            }
          }
          if (o.z <= 0) obstacles.splice(i, 1);
        }
        checkIdle();
        if (flash > 0) flash = Math.max(0, flash - 0.05);
        if (shake.t > 0) { shake.t -= 0.016; shake.x = (Math.random() - 0.5) * 8; shake.y = (Math.random() - 0.5) * 8; }
        else { shake.x = 0; shake.y = 0; }
      }

      let raf = 0;
      function loop() {
        t += 0.016;
        ctx!.clearRect(0, 0, W, H);
        ctx!.save();
        if (shake.x || shake.y) ctx!.translate(shake.x, shake.y);
        if (mode === "standby") drawStandby();
        else if (mode === "boot") drawBoot();
        else {
          step();
          drawScene(); drawObstacles(); drawPlayer(); drawHUD();
          if (attract && !firstInput) {
            ctx!.globalAlpha = 0.55 + 0.35 * Math.sin(t * 3);
            ctx!.fillStyle = "#fff"; ctx!.textAlign = "center";
            ctx!.font = "700 " + Math.max(10, W * 0.028) + "px 'JetBrains Mono'";
            ctx!.fillText("◂ ▸ STEER  /  TAP TO PLAY", W / 2, H * 0.8);
            ctx!.globalAlpha = 1; ctx!.textAlign = "left";
          }
          if (flash > 0) {
            const vg = ctx!.createRadialGradient(W / 2, H * 0.9, W * 0.1, W / 2, H * 0.5, Math.max(W, H));
            vg.addColorStop(0, `rgba(255,40,80,${flash * 0.55})`);
            vg.addColorStop(1, "rgba(255,40,80,0)");
            ctx!.fillStyle = vg; ctx!.fillRect(0, 0, W, H);
          }
        }
        ctx!.restore();
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);

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
          attract = true; firstInput = false;
          input.left = input.right = false;
          player.x = 0; player.vx = 0;
          flash = 0; shake.t = 0; shake.x = 0; shake.y = 0;
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
    }), []);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    );
  }
);

MonitorGame.displayName = "MonitorGame";
export default MonitorGame;
