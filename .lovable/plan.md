# 10 Fixes — TIMKOLAS Homepage Polish Pass

Every change lands in `src/routes/index.tsx` and `src/styles.css`. No restructure — just lock-ins against each numbered complaint.

---

## 1. Hero headline always reads as a full sentence
- Render the cycling word as **static visible text** at all times (`EVERYTHING.` at rest), and only animate the *swap* — old word slides up & out while the new word slides in. Never an empty mask state.
- Rebuild the cycler: two stacked spans (current + incoming). Crossfade/slide only the words, never both gone at once. Use `gsap.timeline` with no in-between blank frame.
- Guarantee: at any paused frame, "COMMAND <WORD>." is visible.

## 2. Right-edge gutter restored everywhere
- Hero `.max-w-7xl` container uses asymmetric padding today (image flows off). Switch to symmetric `px-6 sm:px-10 lg:px-16` and constrain the controller image to `max-w-[min(520px,42vw)]` so it never reaches the viewport edge.
- Audit every full-width section (atmosphere copy, customization, platform) for the same gutter.
- Add a global `.section-x` utility in `styles.css` = `padding-inline: clamp(24px, 5vw, 80px)` and apply to all sections.

## 3. Live synthwave racer back on the monitor
- Port the canvas game from `public/timkolas_scroll_demo_v2.html` into a new React component `src/components/MonitorGame.tsx`:
  - Self-contained `<canvas>` with the same `Game` IIFE logic (standby / boot / play modes, attract weave, obstacles, score, RGB road).
  - Exposes `boot()` / `toStandby()` via `useImperativeHandle`.
  - Carries ENH-1 keyboard + tap-zone steering, gated on `connected` flag.
- Mount it **inside the SVG monitor's screen rect** in the pinned story section via a `foreignObject` so it sits exactly where the wordmark currently does.
- During Beat 4a (plug-in) the game boots; during Beat 4b–4d it stays live. Logo wordmark only shows in standby (controller not yet connected).
- Reduced-motion: skip game, show static wordmark.

## 4. Drop the fake red/magenta controller everywhere
- Delete `src/assets/controller-magenta.png` and `controller-purple.png` from the page (keep files or remove). They are not the real product.
- Colorway section becomes a single "ARC WHITE" showcase frame (the real PNG, large, label `TK-PRO-W`) with copy: "More colorways coming." OR remove the colorway section entirely if user prefers — flag in plan, default = single-finish showcase.
- Customization section: replace the magenta controller with the real white controller, tinted by a magenta backlight halo (CSS glow), not a recolored body.
- Story-section flip: back face also uses the real controller PNG mirrored + a subtle SVG overlay for back-paddle hint (placeholder until a real back PNG is uploaded).

## 5. Story headline no longer hidden behind controller
- Move "/ Built different — THE CONTROLLER THAT PLUGS IN." from the absolute-positioned top-left overlay into a **prominent top-band** that sits *above* the controller's vertical zone (top 6–14% reserved for type only).
- Push the controller flipper's `top` from `14%` to `~30%` and reduce its width to `min(440px, 56vw)` so the headline band stays clean at every beat.
- Add `z-index` so headline is above controller and add a subtle dark gradient behind the text for guaranteed contrast.

## 6. Tighten vertical rhythm — kill the dead voids
- Pinned story stage: was `h-screen` with controller floating top and monitor at `bottom-[6%]`, leaving a huge mid-void. Recompose:
  - Stack vertically: headline (top), controller (upper-mid), monitor (lower-mid) — no gap > 8vh between them.
  - Reduce stage to `min(100vh, 820px)` and re-center the group.
- Cut section padding on screens that read empty: atmosphere → `padding: clamp(64px,10vh,120px) var(--gutter)` instead of full 100vh; value/customization → tighter top/bottom.
- Verify on 956×889 viewport (user's current size): every section's primary content fills ≥70% of its height.

## 7. Atmosphere section — let the image breathe, cyan leads
- Reduce the magenta wash: current overlay is heavy left→right black + magenta gradient. New overlay = `linear-gradient(90deg, rgba(6,6,8,0.7) 0%, rgba(6,6,8,0.25) 60%, transparent 100%)` only (no magenta tint).
- Set `filter: saturate(0.85) contrast(1.05)` on the bg image so the scene reads.
- Move the cyan accent rule (small `/ Atmosphere` eyebrow + `ZERO COMPROMISE` gradient) — keep gradient but bias it 70% cyan / 30% magenta instead of 50/50.

## 8. Color discipline — cyan is king, magenta is rare
- Establish the rule in `styles.css` comment and apply:
  - **Cyan `#00e5ff`** = primary accent (eyebrows, dots, primary CTA, monitor glow, story beam, focus rings).
  - **Magenta `#ff3ea5`** = ≤1 punctuation per section (gradient terminus only).
  - **Purple `#7c3aed`** = retired from foreground use; allowed only as a deep ambient glow ≤15% opacity.
- Sweep: marquee dots all cyan; feature card icon dots cyan; FAQ accents cyan; CTA pill cyan; remove the purple `TIMKOLAS PRO` marquee word color.
- Hero `text-gradient-hero` shifted to `linear-gradient(110deg, #00e5ff 0%, #00e5ff 55%, #ff3ea5 100%)` — cyan-dominant.

## 9. Marquee fixed — one color, one rhythm
- Single-color marquee: all words **white**, separators (`·`) **cyan**. No mid-word color flips.
- Add a 24px black-to-transparent fade mask on the left and right edges of the marquee bar (`mask-image: linear-gradient(90deg, transparent, black 5%, black 95%, transparent)`) so it enters/exits gracefully.
- Add a thin 1px cyan top/bottom border with 30% opacity — deliberate frame, not an accidental slam.

## 10. Make the product the hero
- Hero recompose to product-led:
  - Controller image scales up to `w-[min(720px,55vw)]`, vertically anchored center, slight rotation `-6deg`, dramatic drop-shadow + cyan rim glow (`drop-shadow(0 40px 80px rgba(0,0,0,0.7)) drop-shadow(0 0 90px rgba(0,229,255,0.45))`).
  - Text column shrinks to `max-w-md`, sits left, no longer competing for size.
  - On mobile: controller stacks below text but still occupies ≥55vh.
- Add a subtle slow float (`y: ±8px, 4s sine`, reduced-motion safe) so it feels alive at rest.
- Add a faint cyan radial floor-glow under the controller (deliberate stage lighting).

---

## Technical notes
- New file: `src/components/MonitorGame.tsx` (canvas game IIFE wrapped in React, `useImperativeHandle` for boot/standby; tap-zone overlay only on `<768px`).
- `src/routes/index.tsx`: rewrite hero block (point 10 + 1 + 2), rewrite story stage layout (3 + 5 + 6), rewrite atmosphere overlay (7), simplify colorway grid to single card (4), recolor marquee + cards + gradient (8 + 9).
- `src/styles.css`: add `--gutter` token, `.section-x` utility, color-discipline comment block, updated `--gradient-hero`, edge-mask helper.
- Asset cleanup: stop importing `controller-magenta.png` / `controller-purple.png` in `index.tsx`.

## Out of scope
- No new copy beyond what's needed for point 4's single-finish messaging.
- No new sections, no nav/footer redesign, no back-of-controller PNG sourcing (still placeholder).
- No payments / cart wiring.

## Open decision (will default if not answered)
- **Point 4 colorway section**: default = collapse to single "ARC WHITE" hero frame with "More finishes coming". Tell me if you'd rather **remove the section entirely** instead.
