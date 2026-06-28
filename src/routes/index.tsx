import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import controllerImg from "../assets/controller.png";
import arenaImg from "../assets/arena.jpg";
import logoImg from "../assets/timkolas-logo.png";
import MonitorGame, { type MonitorGameHandle } from "../components/MonitorGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIMKOLAS — Command Everything" },
      {
        name: "description",
        content:
          "TIMKOLAS Pro — a precision gaming controller engineered for players who refuse to lose. Sub-millisecond wireless, RGB on every edge, remappable back buttons.",
      },
      { property: "og:title", content: "TIMKOLAS — Command Everything" },
      {
        property: "og:description",
        content:
          "Premium gaming controllers built for PC, console, and mobile. Low-latency wireless, RGB, ergonomic grip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CYCLE_WORDS = ["EVERYTHING.", "EVERY FRAME.", "THE ARENA."];

const FEATURES = [
  { t: "RGB ON EVERY EDGE", d: "16.7M-colour underglow with per-zone profiles." },
  { t: "LOW-LATENCY WIRELESS", d: "Sub-millisecond 2.4GHz link. Bluetooth fallback." },
  { t: "TEXTURED ERGO GRIPS", d: "Anti-slip diamond grip for 8-hour sessions." },
  { t: "REMAPPABLE BACK BUTTONS", d: "Two macro paddles you can re-bind on the fly." },
  { t: "USB-C FAST CHARGE", d: "40 hours play. Full charge in 90 minutes." },
  { t: "CROSS-PLATFORM", d: "PC · Switch · Android · iOS. One controller." },
];

const PLATFORMS = ["PC", "PS", "XBOX", "SWITCH", "ANDROID", "iOS"];

const FAQS = [
  {
    q: "Does it work on PC and Switch?",
    a: "Yes — TIMKOLAS Pro pairs natively with PC, Switch, Android, and iOS via 2.4GHz wireless or Bluetooth.",
  },
  {
    q: "How long does the battery last?",
    a: "Up to 40 hours of continuous play. A full charge takes about 90 minutes over USB-C.",
  },
  {
    q: "Is the wireless actually low-latency?",
    a: "Sub-1ms over the bundled 2.4GHz adapter. Tournament-grade.",
  },
  {
    q: "Can I remap the buttons?",
    a: "Every face button, trigger, and the two back paddles is remappable through the TIMKOLAS app.",
  },
  {
    q: "What's in the box?",
    a: "Controller, 2.4GHz USB-C dongle, 1.5m braided cable, quick-start card.",
  },
];

function Index() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Hero
  const heroControllerRef = useRef<HTMLImageElement>(null);

  // Cycler (two stacked spans — never blank)
  const [cycleIdx, setCycleIdx] = useState(0);

  // Marquee
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Pinned story
  const storyRef = useRef<HTMLDivElement>(null);
  const storyStageRef = useRef<HTMLDivElement>(null);
  const storyControllerFrontRef = useRef<HTMLImageElement>(null);
  const storyControllerBackRef = useRef<HTMLImageElement>(null);
  const storyControllerFlipperRef = useRef<HTMLDivElement>(null);
  const storyMonitorRef = useRef<HTMLDivElement>(null);
  const storyBeamRef = useRef<HTMLDivElement>(null);
  const storyBgVoidRef = useRef<HTMLDivElement>(null);
  const storyBgArenaRef = useRef<HTMLDivElement>(null);
  const storyBgBattleRef = useRef<HTMLDivElement>(null);
  const featureCardsRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<MonitorGameHandle>(null);
  const connectedRef = useRef(false);

  // Atmosphere
  const atmoBgRef = useRef<HTMLDivElement>(null);

  // Mobile nav
  const [navOpen, setNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Word cycler — both spans always rendered, only swap animates.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => {
      setCycleIdx((i) => (i + 1) % CYCLE_WORDS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  // GSAP + Lenis master timeline
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
      });
      lenis.on("scroll", ScrollTrigger.update);
      const tickerFn = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        // --- Marquee infinite x ---
        if (marqueeRef.current && !reduce) {
          const track = marqueeRef.current;
          const w = track.scrollWidth / 2;
          gsap.to(track, { x: -w, duration: 22, ease: "none", repeat: -1 });
        }

        // --- Hero idle float ---
        if (heroControllerRef.current && !reduce) {
          gsap.to(heroControllerRef.current, {
            y: -10,
            duration: 3.6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        // --- Fade-ins ---
        gsap.utils.toArray<HTMLElement>("[data-fade]").forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });

        // --- Pinned controller story ---
        const mm = gsap.matchMedia();

        const buildStory = (pinDistance: number, withCards: boolean) => {
          if (!storyRef.current) return;
          gsap.set(storyControllerFlipperRef.current, {
            yPercent: -160,
            xPercent: 0,
            rotate: -8,
            rotationY: 0,
            scale: 0.78,
            transformOrigin: "50% 50%",
            transformPerspective: 1200,
          });
          gsap.set(storyMonitorRef.current, { opacity: 0.6, y: 20 });
          gsap.set(storyBeamRef.current, { opacity: 0, scaleY: 0.2 });
          gsap.set(storyBgVoidRef.current, { opacity: 1 });
          gsap.set(storyBgBattleRef.current, { opacity: 0 });
          gsap.set(storyBgArenaRef.current, { opacity: 0 });
          gsap.set(storyControllerFrontRef.current, { opacity: 1 });
          gsap.set(storyControllerBackRef.current, { opacity: 0 });
          if (withCards) gsap.set(".feature-card", { opacity: 0, y: 40 });

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: storyRef.current,
              start: "top top",
              end: `+=${pinDistance}`,
              pin: storyStageRef.current,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                if (self.progress > 0.24 && !connectedRef.current) {
                  connectedRef.current = true;
                  gameRef.current?.boot();
                } else if (self.progress < 0.2 && connectedRef.current) {
                  connectedRef.current = false;
                  gameRef.current?.toStandby();
                }
              },
            },
          });

          // Beat A · descend + plug-in
          tl.to(
            storyControllerFlipperRef.current,
            { yPercent: -30, rotate: 0, scale: 1, duration: 0.2, ease: "power3.out" },
            0.0,
          );
          tl.to(storyMonitorRef.current, { opacity: 1, y: 0, duration: 0.18 }, 0.04);
          tl.to(
            storyControllerFlipperRef.current,
            { yPercent: -18, scale: 1.02, duration: 0.08, ease: "power2.in" },
            0.2,
          );
          tl.to(
            storyBeamRef.current,
            { opacity: 1, scaleY: 1, duration: 0.06, ease: "power2.out" },
            0.22,
          );

          // Beat B · void → battlestation
          tl.to(storyBgVoidRef.current, { opacity: 0, duration: 0.2, ease: "power1.inOut" }, 0.28);
          tl.to(
            storyBgBattleRef.current,
            { opacity: 1, duration: 0.2, ease: "power1.inOut" },
            0.28,
          );
          tl.to(storyBeamRef.current, { opacity: 0.4, duration: 0.16 }, 0.32);

          // Beat C · flip
          tl.to(
            storyControllerFlipperRef.current,
            { rotationY: 180, duration: 0.22, ease: "power2.inOut" },
            0.48,
          );
          tl.to(
            storyControllerFlipperRef.current,
            {
              yPercent: -22,
              scale: 1.04,
              duration: 0.11,
              ease: "power2.out",
              yoyo: true,
              repeat: 1,
            },
            0.48,
          );
          tl.to(storyControllerFrontRef.current, { opacity: 0, duration: 0.01 }, 0.59);
          tl.to(storyControllerBackRef.current, { opacity: 1, duration: 0.01 }, 0.59);

          // Beat D · arena (+ desktop-only drift + card stagger)
          tl.to(
            storyBgBattleRef.current,
            { opacity: 0, duration: 0.22, ease: "power1.inOut" },
            0.7,
          );
          tl.to(storyBgArenaRef.current, { opacity: 1, duration: 0.22, ease: "power1.inOut" }, 0.7);
          tl.to(storyBeamRef.current, { opacity: 0, duration: 0.18 }, 0.74);
          if (withCards) {
            // Desktop: slide the controller left to make room for the card column.
            tl.to(
              storyControllerFlipperRef.current,
              { xPercent: -28, scale: 0.88, duration: 0.24, ease: "power2.out" },
              0.7,
            );
            tl.to(
              ".feature-card",
              { opacity: 1, y: 0, stagger: 0.035, duration: 0.18, ease: "power2.out" },
              0.74,
            );
          } else {
            // Mobile/tablet: keep the controller centered above the monitor.
            tl.to(
              storyControllerFlipperRef.current,
              { xPercent: 0, scale: 0.9, duration: 0.24, ease: "power2.out" },
              0.7,
            );
          }
        };

        if (!reduce) {
          mm.add("(min-width: 1024px)", () => buildStory(3600, true));
          mm.add("(max-width: 1023.98px)", () => {
            buildStory(2400, false);
            // Features render as a normal single-column section below the pin.
            gsap.from("[data-feature-card]", {
              opacity: 0,
              y: 40,
              stagger: 0.12,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: { trigger: "#features-mobile", start: "top 80%" },
            });
          });
        } else {
          gsap.set(storyControllerFlipperRef.current, { yPercent: -18, rotate: 0, scale: 1 });
          gsap.set(storyMonitorRef.current, { opacity: 1, y: 0 });
          gsap.set(storyBgArenaRef.current, { opacity: 1 });
          gsap.set(storyBgVoidRef.current, { opacity: 0 });
          gsap.set(".feature-card", { opacity: 1, y: 0 });
          gameRef.current?.boot();
        }

        // Atmosphere parallax
        if (atmoBgRef.current && !reduce) {
          gsap.to(atmoBgRef.current, {
            yPercent: -20,
            ease: "none",
            scrollTrigger: {
              trigger: atmoBgRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      }, rootRef);

      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);

      cleanup = () => {
        window.removeEventListener("load", onLoad);
        ctx.revert();
        gsap.ticker.remove(tickerFn);
        lenis.destroy();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div ref={rootRef} className="relative bg-background text-foreground">
      {/* ============= NAV ============= */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          className="mx-3 mt-4 flex max-w-7xl items-center justify-between rounded-2xl border px-5 py-3 sm:mx-6 lg:mx-auto"
          style={{
            background: "var(--nav-glass)",
            borderColor: "var(--glass-border)",
            backdropFilter: "blur(14px) saturate(140%)",
          }}
        >
          <a href="#top" className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="TIMKOLAS"
              className="h-9 w-auto select-none"
              style={{ filter: "drop-shadow(0 0 12px rgba(0,229,255,0.35))" }}
              draggable={false}
            />
          </a>
          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#specs" className="transition hover:text-white">
              Specs
            </a>
            <a href="#game" className="transition hover:text-white">
              Game
            </a>
            <a href="#support" className="transition hover:text-white">
              Support
            </a>
          </nav>
          <a href="#cta" className="pill pill-primary hidden md:inline-flex">
            Get One
          </a>
          <button
            aria-label="Open menu"
            className="md:hidden grid h-9 w-9 place-items-center rounded-md border"
            style={{ borderColor: "var(--glass-border)" }}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-px w-5 bg-white" />
              <span className="block h-px w-5 bg-white" />
            </span>
          </button>
        </div>
        {navOpen && (
          <div
            className="mx-3 mt-2 rounded-2xl border px-5 py-4 md:hidden"
            style={{
              background: "var(--nav-glass)",
              borderColor: "var(--glass-border)",
              backdropFilter: "blur(14px)",
            }}
          >
            <nav className="flex flex-col gap-3 text-sm text-white/80">
              <a href="#features" onClick={() => setNavOpen(false)}>
                Features
              </a>
              <a href="#specs" onClick={() => setNavOpen(false)}>
                Specs
              </a>
              <a href="#game" onClick={() => setNavOpen(false)}>
                Game
              </a>
              <a href="#support" onClick={() => setNavOpen(false)}>
                Support
              </a>
              <a
                href="#cta"
                className="pill pill-primary self-start mt-2"
                onClick={() => setNavOpen(false)}
              >
                Get One
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* ============= HERO — product-led ============= */}
      <section
        id="top"
        className="relative flex min-h-screen w-full items-center overflow-hidden pt-32 pb-16"
        style={{
          paddingInline: "var(--gutter)",
          background:
            "radial-gradient(120% 80% at 50% 110%, #15152e 0%, #08081a 55%, #060608 100%)",
        }}
      >
        {/* Ambient color washes — cyan dominant */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 100%, rgba(0,229,255,0.35), transparent 70%), radial-gradient(35% 45% at 85% 30%, rgba(255,62,165,0.15), transparent 70%)",
          }}
        />
        {/* Floor grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,229,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,229,255,0.18) 1px, transparent 1px)",
            backgroundSize: "60px 60px, 60px 60px",
            transform: "perspective(700px) rotateX(62deg)",
            transformOrigin: "50% 100%",
            maskImage: "linear-gradient(to top, black 10%, transparent 90%)",
          }}
        />

        <div className="shell relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Text column */}
          <div className="max-w-[640px]">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.35em] text-white/70 backdrop-blur"
              style={{ borderColor: "var(--glass-border)", background: "rgba(255,255,255,0.04)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }}
              />
              New · TIMKOLAS Pro
            </span>
            <h1
              className="mt-6 font-display leading-[0.98] tracking-tight"
              style={{ fontSize: "clamp(32px, 4.6vw, 60px)" }}
            >
              <span className="block">COMMAND</span>
              <span className="relative block overflow-hidden" style={{ height: "1.12em" }}>
                {CYCLE_WORDS.map((w, i) => {
                  const offset = (i - cycleIdx + CYCLE_WORDS.length) % CYCLE_WORDS.length;
                  // active → 0, next → 100%, prev → -100% (so it slides up out)
                  const y = offset === 0 ? 0 : offset === CYCLE_WORDS.length - 1 ? -100 : 100;
                  const op = offset === 0 ? 1 : 0;
                  return (
                    <span
                      key={w}
                      aria-hidden={offset !== 0}
                      className="absolute inset-0 block whitespace-nowrap text-gradient-hero transition-all duration-[600ms] ease-[cubic-bezier(.7,0,.2,1)]"
                      style={{
                        transform: `translateY(${y}%)`,
                        opacity: op,
                        willChange: "transform, opacity",
                      }}
                    >
                      {w}
                    </span>
                  );
                })}
                {/* invisible sizer keeps height stable */}
                <span aria-hidden className="block whitespace-nowrap opacity-0 select-none">
                  EVERYTHING.
                </span>
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/65">
              A controller engineered for the players who refuse to lose. Sub-millisecond wireless,
              RGB on every edge, remappable back paddles.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#cta" className="pill pill-primary">
                Get One
              </a>
              <a href="#features" className="pill pill-ghost">
                See Specs
              </a>
            </div>
          </div>

          {/* Product column — HERO. Big, lit, reverent. */}
          <div className="relative flex items-center justify-center">
            {/* floor glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[68%] h-[55%] w-[85%] -translate-x-1/2 rounded-full"
              style={{
                background: "radial-gradient(closest-side, rgba(0,229,255,0.45), transparent 70%)",
                filter: "blur(28px)",
              }}
            />
            <img
              ref={heroControllerRef}
              src={controllerImg}
              alt="TIMKOLAS Pro gaming controller"
              className="pointer-events-none relative w-full max-w-[640px] select-none"
              style={{
                transform: "rotate(-6deg)",
                filter:
                  "drop-shadow(0 40px 80px rgba(0,0,0,0.7)) drop-shadow(0 0 90px rgba(0,229,255,0.45))",
              }}
              draggable={false}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            Scroll ↓
          </span>
        </div>
      </section>

      {/* ============= MARQUEE ============= */}
      <section
        className="marquee-mask relative w-full overflow-hidden border-y"
        style={{
          background: "var(--marquee-bg)",
          borderColor: "rgba(0,229,255,0.3)",
          height: "96px",
        }}
      >
        <div
          ref={marqueeRef}
          className="absolute top-1/2 left-0 flex -translate-y-1/2 whitespace-nowrap"
          style={{ willChange: "transform" }}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-12 pr-12 font-display text-white"
              style={{ fontSize: "64px", fontWeight: 400, lineHeight: 1 }}
            >
              <span>WE ARE WHAT WE PLAY</span>
              <span style={{ color: "#00e5ff" }}>·</span>
              <span>ZERO LAG</span>
              <span style={{ color: "#00e5ff" }}>·</span>
              <span>TOTAL CONTROL</span>
              <span style={{ color: "#00e5ff" }}>·</span>
              <span>TIMKOLAS PRO</span>
              <span style={{ color: "#00e5ff" }}>·</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============= PINNED CONTROLLER STORY ============= */}
      <section id="features" ref={storyRef} className="relative w-full">
        <div ref={storyStageRef} className="relative h-screen w-full overflow-hidden">
          {/* Backgrounds */}
          <div
            ref={storyBgVoidRef}
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 110%, #15152e 0%, #08081a 55%, #060608 100%)",
            }}
          />
          <div
            ref={storyBgBattleRef}
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(45% 45% at 50% 70%, rgba(0,229,255,0.35), transparent 70%), radial-gradient(40% 40% at 20% 60%, rgba(124,58,237,0.25), transparent 70%), #060608",
            }}
          />
          <div
            ref={storyBgArenaRef}
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(6,6,8,0.65), rgba(6,6,8,0.85)), url(${arenaImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "saturate(0.9)",
            }}
          />

          {/* Top headline band — always above controller, dark gradient backing */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-40 pt-24 pb-6 text-center"
            style={{
              paddingInline: "var(--gutter)",
              background: "linear-gradient(to bottom, rgba(6,6,8,0.75), transparent)",
            }}
          >
            <p className="eyebrow">/ Built different</p>
            <h2 className="mt-2 font-display text-2xl text-white sm:text-4xl">
              THE CONTROLLER THAT PLUGS IN.
            </h2>
          </div>

          {/* Monitor — bottom centered, with live game on screen */}
          <div
            ref={storyMonitorRef}
            className="absolute left-1/2 bottom-[4%] z-20 w-[min(520px,72vw)] -translate-x-1/2"
          >
            <div className="relative" style={{ aspectRatio: "560 / 360" }}>
              <svg viewBox="0 0 560 360" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="story-bezel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1a26" />
                    <stop offset="100%" stopColor="#08080d" />
                  </linearGradient>
                </defs>
                <path
                  d="M240 300 L320 300 L340 340 L220 340 Z"
                  fill="url(#story-bezel)"
                  stroke="rgba(255,255,255,0.15)"
                />
                <rect
                  x="180"
                  y="336"
                  width="200"
                  height="10"
                  rx="4"
                  fill="url(#story-bezel)"
                  stroke="rgba(255,255,255,0.15)"
                />
                <rect
                  x="20"
                  y="20"
                  width="520"
                  height="290"
                  rx="14"
                  fill="url(#story-bezel)"
                  stroke="rgba(0,229,255,0.35)"
                />
              </svg>
              {/* Live canvas game pinned over the screen rect */}
              <div
                className="absolute overflow-hidden rounded-[6px]"
                style={{
                  left: `${(36 / 560) * 100}%`,
                  top: `${(36 / 360) * 100}%`,
                  width: `${(488 / 560) * 100}%`,
                  height: `${(258 / 360) * 100}%`,
                  boxShadow: "0 0 30px rgba(0,229,255,0.6), 0 0 80px rgba(0,229,255,0.25)",
                }}
              >
                <MonitorGame ref={gameRef} />
              </div>
            </div>
          </div>

          {/* Light beam */}
          <div
            ref={storyBeamRef}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[44%] z-[15] h-[34vh] w-[80px] -translate-x-1/2 origin-top"
            style={{
              background: "linear-gradient(to bottom, rgba(0,229,255,0.9), transparent)",
              filter: "blur(12px)",
              maskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />

          {/* Controller flipper — top zone */}
          <div
            ref={storyControllerFlipperRef}
            className="pointer-events-none absolute left-1/2 top-[30%] z-30 w-[min(440px,56vw)] -translate-x-1/2"
            style={{ transformStyle: "preserve-3d", willChange: "transform" }}
          >
            <img
              ref={storyControllerFrontRef}
              src={controllerImg}
              alt="TIMKOLAS Pro controller — front"
              className="block w-full select-none"
              style={{
                filter:
                  "drop-shadow(0 30px 50px rgba(0,0,0,0.6)) drop-shadow(0 0 40px rgba(0,229,255,0.4))",
                backfaceVisibility: "hidden",
              }}
              draggable={false}
            />
            <img
              ref={storyControllerBackRef}
              src={controllerImg}
              alt="TIMKOLAS Pro controller — back"
              className="absolute inset-0 block w-full select-none"
              style={{
                transform: "rotateY(180deg) scaleX(-1)",
                filter:
                  "drop-shadow(0 30px 50px rgba(0,0,0,0.6)) drop-shadow(0 0 40px rgba(0,229,255,0.4))",
                backfaceVisibility: "hidden",
              }}
              draggable={false}
            />
          </div>

          {/* Feature cards — desktop overlay only (mobile uses #features-mobile below) */}
          <div
            ref={featureCardsRef}
            className="pointer-events-none absolute top-1/2 z-40 hidden w-[min(360px,34vw)] -translate-y-1/2 grid-cols-1 gap-3 lg:grid"
            style={{ right: "var(--gutter)" }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.t}
                className="feature-card rounded-xl border p-4"
                style={{
                  background: "rgba(12,12,22,0.55)",
                  borderColor: "var(--glass-border)",
                  backdropFilter: "blur(10px)",
                  willChange: "transform, opacity",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md"
                    style={{ background: "rgba(0,229,255,0.15)" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }}
                    />
                  </span>
                  <div>
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      {f.t}
                    </h4>
                    <p className="mt-1 text-[13px] text-white/65">{f.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES — mobile/tablet single-column (desktop uses the pinned overlay) ===== */}
      <section
        id="features-mobile"
        className="relative w-full lg:hidden"
        style={{ paddingInline: "var(--gutter)", paddingBlock: "var(--section-y)" }}
      >
        <div className="shell">
          <p className="eyebrow">/ Built different</p>
          <h2 className="mt-3 font-display text-3xl text-white">EVERY EDGE, ENGINEERED.</h2>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.t}
                data-feature-card
                className="rounded-xl border p-4"
                style={{
                  background: "rgba(12,12,22,0.55)",
                  borderColor: "var(--glass-border)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md"
                    style={{ background: "rgba(0,229,255,0.15)" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }}
                    />
                  </span>
                  <div>
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      {f.t}
                    </h4>
                    <p className="mt-1 text-[13px] text-white/65">{f.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= ATMOSPHERE ============= */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: "82vh" }}>
        <div
          ref={atmoBgRef}
          aria-hidden
          className="absolute inset-0 -top-[10%] -bottom-[10%]"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(6,6,8,0.7) 0%, rgba(6,6,8,0.25) 60%, transparent 100%), url(${arenaImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(0.85) contrast(1.05)",
            willChange: "transform",
          }}
        />
        <div
          className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center"
          style={{
            paddingInline: "var(--gutter)",
            paddingBlock: "var(--section-y)",
            minHeight: "82vh",
          }}
        >
          <p data-fade className="eyebrow">
            / Atmosphere
          </p>
          <h3
            data-fade
            className="mt-4 max-w-2xl font-display text-3xl leading-tight text-white sm:text-5xl"
          >
            PURE PRECISION.
            <br />
            <span className="text-gradient-hero">ZERO COMPROMISE.</span>
          </h3>
          <p data-fade className="mt-6 max-w-xl text-base text-white/70">
            Tournament-grade analog sticks, sub-millisecond wireless, and RGB you actually control —
            engineered for players who refuse to lose.
          </p>
        </div>
      </section>

      {/* ============= COLORWAY — single real finish ============= */}
      <section
        id="specs"
        className="relative w-full"
        style={{ paddingInline: "var(--gutter)", paddingBlock: "var(--section-y)" }}
      >
        <div className="mx-auto max-w-5xl text-center">
          <p data-fade className="eyebrow">
            / Finish
          </p>
          <h3 data-fade className="mt-4 font-display text-3xl text-white sm:text-5xl">
            TOTAL CONTROL.
          </h3>
          <p data-fade className="mx-auto mt-4 max-w-xl text-white/65">
            Signature ARC WHITE with full RGB underglow. More finishes coming.
          </p>
          <div data-fade className="relative mx-auto mt-12 w-full max-w-2xl">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: "radial-gradient(closest-side, rgba(0,229,255,0.28), transparent 70%)",
                filter: "blur(20px)",
              }}
            />
            <img
              src={controllerImg}
              alt="TIMKOLAS Pro — ARC WHITE"
              loading="lazy"
              className="mx-auto w-full"
              style={{
                filter:
                  "drop-shadow(0 30px 50px rgba(0,0,0,0.6)) drop-shadow(0 0 60px rgba(0,229,255,0.35))",
              }}
            />
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-white/55">
            TK-PRO-W · ARC WHITE
          </p>
          <div className="mt-10 flex justify-center">
            <a href="#cta" className="pill pill-primary">
              Buy Now
            </a>
          </div>
        </div>
      </section>

      {/* ============= VALUE ============= */}
      <section
        className="relative w-full overflow-hidden"
        style={{ paddingInline: "var(--gutter)", paddingBlock: "var(--section-y)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(closest-side, rgba(0,229,255,0.18), transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p data-fade className="eyebrow">
            / Why TIMKOLAS
          </p>
          <h3 data-fade className="mt-4 font-display text-3xl text-white sm:text-5xl">
            EVERY MATCH,
            <br />
            <span className="text-gradient-hero">TOTAL CONTROL.</span>
          </h3>
          <ul className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
            {[
              { k: "<1ms", v: "Wireless latency" },
              { k: "40h", v: "Battery, full charge in 90 min" },
              { k: "6", v: "Native platforms" },
            ].map((s) => (
              <li
                key={s.k}
                data-fade
                className="rounded-xl border p-5"
                style={{ background: "var(--faq-item-bg)", borderColor: "var(--glass-border)" }}
              >
                <p className="font-display text-2xl text-white">{s.k}</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">
                  {s.v}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <a href="#cta" className="pill pill-primary">
              Get One
            </a>
          </div>
        </div>
      </section>

      {/* ============= CUSTOMIZATION — real product, cyan glow ============= */}
      <section
        className="relative w-full"
        style={{ paddingInline: "var(--gutter)", paddingBlock: "var(--section-y)" }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
          <div>
            <p data-fade className="eyebrow">
              / Customize
            </p>
            <h3 data-fade className="mt-4 font-display text-3xl text-white sm:text-5xl">
              MAKE IT YOURS.
            </h3>
            <p data-fade className="mt-6 max-w-md text-white/70">
              Per-zone RGB profiles. Remap every button, including the back paddles. Save turbo
              macros to on-board memory and carry them tournament-to-tournament.
            </p>
            <div className="mt-8">
              <a href="#cta" data-fade className="pill pill-primary">
                Customize
              </a>
            </div>
          </div>
          <div data-fade className="relative">
            <div
              className="absolute inset-0 -z-10 rounded-3xl"
              style={{
                background: "radial-gradient(closest-side, rgba(0,229,255,0.22), transparent 70%)",
              }}
            />
            <img
              src={controllerImg}
              alt="TIMKOLAS Pro controller"
              loading="lazy"
              className="mx-auto w-full max-w-[480px]"
              style={{
                filter:
                  "drop-shadow(0 30px 50px rgba(0,0,0,0.5)) drop-shadow(0 0 50px rgba(0,229,255,0.3))",
              }}
            />
          </div>
        </div>
      </section>

      {/* ============= PLATFORM ============= */}
      <section
        id="game"
        className="relative w-full"
        style={{ paddingInline: "var(--gutter)", paddingBlock: "var(--section-y)" }}
      >
        <div className="mx-auto max-w-5xl text-center">
          <p data-fade className="eyebrow">
            / Compatibility
          </p>
          <h3 data-fade className="mt-4 font-display text-3xl text-white sm:text-5xl">
            PLAYS WITH
            <br />
            EVERYTHING.
          </h3>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                data-fade
                className="rounded-full border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.2em] text-white/75"
                style={{ background: "var(--faq-item-bg)", borderColor: "var(--glass-border)" }}
              >
                {p}
              </span>
            ))}
          </div>
          <div className="mt-10">
            <a href="#specs" className="pill pill-ghost">
              See Specs
            </a>
          </div>
        </div>
      </section>

      {/* ============= FAQ ============= */}
      <section
        id="support"
        className="relative w-full"
        style={{ paddingInline: "var(--gutter)", paddingBlock: "var(--section-y)" }}
      >
        <div className="mx-auto max-w-3xl">
          <h2 data-fade className="font-display text-3xl text-white sm:text-4xl">
            FAQs
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  data-fade
                  className="overflow-hidden border"
                  style={{
                    background: "var(--faq-item-bg)",
                    borderColor: "var(--glass-border)",
                    borderRadius: "var(--radius-faq)",
                    padding: "var(--padding-card)",
                  }}
                >
                  <button
                    className="flex w-full items-center justify-between gap-4 text-left"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="font-display text-base text-white sm:text-lg">{f.q}</span>
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white transition-transform duration-300"
                      style={{
                        background: "rgba(0,229,255,0.12)",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      ▾
                    </span>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="pt-3 text-sm text-white/65">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============= CTA ============= */}
      <section
        id="cta"
        className="relative w-full overflow-hidden"
        style={{ paddingInline: "var(--gutter)", paddingBlock: "96px" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 50%, rgba(0,229,255,0.22), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p data-fade className="eyebrow">
            / Squad up
          </p>
          <h3 data-fade className="mt-4 font-display text-3xl text-white sm:text-5xl">
            JOIN THE SQUAD.
          </h3>
          <p data-fade className="mt-6 text-white/70">
            Drops, tournaments, and firmware updates first. Discord + Instagram.
          </p>
          <div data-fade className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#" className="pill pill-primary">
              Join the Movement
            </a>
            <a href="#" className="pill pill-ghost">
              Discord
            </a>
          </div>
        </div>
      </section>

      {/* ============= FOOTER ============= */}
      <footer
        className="w-full border-t"
        style={{ background: "var(--footer-bg)", borderColor: "var(--glass-border)" }}
      >
        <div
          className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-16 md:grid-cols-4"
          style={{ paddingInline: "var(--gutter)" }}
        >
          <div>
            <img
              src={logoImg}
              alt="TIMKOLAS"
              className="h-12 w-auto select-none"
              style={{ filter: "drop-shadow(0 0 16px rgba(0,229,255,0.3))" }}
              draggable={false}
            />
            <p className="mt-4 max-w-xs text-sm text-white/55">
              Precision gaming hardware. Built for players who refuse to lose.
            </p>
          </div>
          <div>
            <h5 className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/55">
              Resources
            </h5>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li>
                <a href="#" className="hover:text-white">
                  Shop
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Support
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Become a Distributor
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Become a Retailer
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/55">
              Pages
            </h5>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li>
                <a href="#" className="hover:text-white">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/55">
              Follow
            </h5>
            <ul className="mt-4 flex flex-wrap gap-3">
              {["Instagram", "Discord", "X", "YouTube"].map((s) => (
                <li key={s}>
                  <a
                    href="#"
                    className="rounded-full border px-3 py-1.5 text-xs text-white/75 hover:text-white"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="border-t py-6"
          style={{ borderColor: "var(--glass-border)", paddingInline: "var(--gutter)" }}
        >
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 text-xs text-white/45 sm:flex-row sm:items-center">
            <span className="font-mono tracking-[0.2em]">KJ-GAME-218</span>
            <span>© 2026 TIMKOLAS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
