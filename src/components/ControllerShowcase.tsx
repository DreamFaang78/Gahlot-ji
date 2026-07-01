import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

// Register ScrollTrigger to ensure it works with GSAP
gsap.registerPlugin(ScrollTrigger);

// Performance Optimizations
gsap.ticker.lagSmoothing(500, 33);
ScrollTrigger.normalizeScroll(true);

export default function ControllerShowcase() {
  // Root container ref for scoping GSAP selectors and handling automated cleanup
  const containerRef = useRef<HTMLDivElement>(null);

  // Force ScrollTrigger to recalculate after images load to fix scrub calculations
  useEffect(() => {
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useGSAP(
    () => {
      // Scene 1 Reveal Animation
      const scene1Tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-1",
          start: "top top",
          end: "center top",
          scrub: true,
        },
      });

      scene1Tl.to(".hero-reveal", {
        filter: "brightness(1) contrast(1)",
        ease: "none",
      });

      scene1Tl.to([".rgb-glow-left", ".rgb-glow-right"], {
        opacity: 0.8,
        ease: "power2.out",
      }, "<");

      // Scene 2 Telemetry Lines
      const scene2Tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-2",
          start: "top 60%",
          end: "center center",
          scrub: 1,
        },
      });

      scene2Tl.to(["#line-left", "#line-right"], {
        strokeDashoffset: 0,
        ease: "power2.inOut",
      });

      scene2Tl.to(".telemetry-text", {
        opacity: 1,
        y: -10,
        ease: "power2.out",
        stagger: 0.1,
      }, "<0.2");

      // Scene 3 Trigger Zoom
      const scene3Tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-3",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      scene3Tl.to(".top-view-zoom", {
        scale: 1,
        ease: "power2.out",
      });

      scene3Tl.to(".trigger-text", {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      }, "<");

      // Scene 4 Hero Finale
      const scene4Tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-4",
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      scene4Tl.to(".finale-img", {
        scale: 1,
        opacity: 1,
        ease: "power4.inOut",
      }, 0);

      scene4Tl.to(".finale-logo", {
        opacity: 1,
        y: 0,
        ease: "power2.out",
      }, "-=0.2");
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="w-full relative bg-black transition-colors duration-1000">
      {/* Scene 1 (The Reveal) */}
      <section id="scene-1" className="h-[200vh] w-full">
        <div className="sticky top-0 h-[100vh] w-full flex items-center justify-center overflow-hidden">
          
          <img 
            src="/controller-front.png" 
            alt="TIMKOLAS Controller Front"
            loading="eager"
            className="hero-reveal max-h-[70vh] w-auto object-contain relative z-20 mix-blend-screen transition-none brightness-[0.2] contrast-[1.2] will-change-transform"
          />

          <div className="absolute left-[30%] top-[30%] w-[100px] h-[100px] md:w-[150px] md:h-[150px] bg-orange-500 rounded-full blur-[60px] md:blur-[80px] opacity-0 rgb-glow-left z-10 will-change-transform"></div>
          <div className="absolute right-[30%] bottom-[30%] w-[100px] h-[100px] md:w-[150px] md:h-[150px] bg-cyan-400 rounded-full blur-[60px] md:blur-[80px] opacity-0 rgb-glow-right z-10 will-change-transform"></div>

        </div>
      </section>

      {/* Scene 2 (Telemetry Lines) */}
      <section id="scene-2" className="h-[200vh] w-full">
        <div className="sticky top-0 h-[100vh] w-full flex items-center justify-center overflow-hidden">
          
          <div className="relative w-full max-w-lg md:max-w-4xl flex justify-center items-center">
            
            {/* Back Image */}
            <img 
              src="/controller-back.png" 
              alt="TIMKOLAS Controller Back"
              loading="eager"
              className="max-h-[70vh] w-auto object-contain relative z-10 mix-blend-screen will-change-transform"
            />
            
            {/* SVG Telemetry Lines */}
            <svg 
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]"
              viewBox="0 0 1000 1000" 
              preserveAspectRatio="xMidYMid slice"
            >
              <path 
                id="line-left" 
                d="M 500 500 L 150 950" 
                fill="none" 
                stroke="#00ffcc" 
                strokeWidth="2" 
                strokeDasharray="600" 
                strokeDashoffset="600"
                className="will-change-transform"
              />
              <path 
                id="line-right" 
                d="M 500 500 L 850 950" 
                fill="none" 
                stroke="#00ffcc" 
                strokeWidth="2" 
                strokeDasharray="600" 
                strokeDashoffset="600"
                className="will-change-transform"
              />
            </svg>

            {/* Telemetry Texts */}
            <div className="telemetry-text opacity-0 absolute top-[105%] md:top-[85%] left-0 md:left-[-10%] text-white font-black text-xs md:text-3xl max-w-[45%] pl-4 md:pl-0 text-left will-change-transform">
              SMART ONE-KEY COMBO
            </div>
            <div className="telemetry-text opacity-0 absolute top-[105%] md:top-[85%] right-0 md:right-[-10%] text-white font-black text-xs md:text-3xl max-w-[45%] pr-4 md:pr-0 text-right will-change-transform">
              ELITE BACK BUTTONS
            </div>
            
          </div>

        </div>
      </section>

      {/* Scene 3 (Trigger Zoom) */}
      <section id="scene-3" className="h-[150vh] w-full">
        <div className="sticky top-0 h-[100vh] w-full flex items-center justify-center overflow-hidden">
          
          <h2 className="trigger-text absolute top-[15%] md:top-[20%] text-3xl md:text-5xl font-black translate-y-10 opacity-0 text-white z-30 text-center w-full will-change-transform">
            SIMULATED TRIGGER
          </h2>
          
          <div className="relative w-full max-w-lg md:max-w-4xl flex justify-center items-center">
            <img 
              src="/controller-top.png" 
              alt="TIMKOLAS Controller Top"
              loading="eager"
              className="top-view-zoom translate-x-3 md:translate-x-4 max-h-[70vh] w-auto object-contain relative z-20 scale-[1.2] md:scale-[1.5] origin-center mix-blend-screen will-change-transform"
            />
          </div>
          
        </div>
      </section>

      {/* Scene 4 (Hero Finale) */}
      <section id="scene-4" className="h-[150vh] w-full">
        <div className="sticky top-0 h-[100vh] w-full flex items-center justify-center overflow-hidden">
          
          <div className="flex flex-col items-center justify-center w-full">
            <img 
              src="/controller-front.png" 
              alt="TIMKOLAS Controller Finale"
              loading="eager"
              className="finale-img max-h-[80vh] w-auto object-contain relative z-20 scale-[0.2] opacity-0 mix-blend-screen will-change-transform"
            />
            
            <h1 className="finale-logo text-white text-4xl md:text-7xl font-black mt-8 md:mt-12 opacity-0 translate-y-8 will-change-transform">
              PRO GAMING SERIES
            </h1>
          </div>
          
        </div>
      </section>

    </div>
  );
}
