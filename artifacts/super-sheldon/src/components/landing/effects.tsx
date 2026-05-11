// Premium landing effects: cursor follower, magnetic CTAs, count-up,
// ambient orbs, verb rotator, pulse waveform, logo marquee.
//
// Every animation respects prefers-reduced-motion and falls back to a
// static / first-state-only render.

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";

// ─── prefers-reduced-motion helper ────────────────────────────────────────
function useReduced(): boolean {
  return useReducedMotion() ?? false;
}

// ─── Cursor follower (Linear / Arc style, mix-blend-mode) ─────────────────
export function CustomCursor() {
  const reduced = useReduced();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 600, damping: 36, mass: 0.18 });
  const sy = useSpring(y, { stiffness: 600, damping: 36, mass: 0.18 });
  const [hot, setHot] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const interactive = t.closest("button, a, [data-cursor=hot]");
      setHot(Boolean(interactive));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    document.documentElement.classList.add("lp-cursor-active");
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.documentElement.classList.remove("lp-cursor-active");
    };
  }, [reduced, x, y]);

  if (reduced) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[100] rounded-full hidden md:block"
      style={{
        x: sx,
        y: sy,
        translateX: "-50%",
        translateY: "-50%",
        width: hot ? 56 : 14,
        height: hot ? 56 : 14,
        backgroundColor: hot ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.75)",
        mixBlendMode: "difference",
        transition: "width 0.22s cubic-bezier(.16,1,.3,1), height 0.22s cubic-bezier(.16,1,.3,1)",
      }}
    />
  );
}

// ─── Magnetic button — pulls toward cursor within radius ──────────────────
export function MagneticButton({
  children,
  className = "",
  href,
  onClick,
  variant = "primary",
  ...rest
}: React.PropsWithChildren<{
  className?: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
} & React.HTMLAttributes<HTMLElement>>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 14 });
  const sy = useSpring(y, { stiffness: 200, damping: 14 });

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        x.set(dx * 0.22);
        y.set(dy * 0.22);
      } else {
        x.set(0);
        y.set(0);
      }
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced, x, y]);

  const baseClasses =
    variant === "primary"
      ? "bg-[#FF7A00] hover:bg-[#FF8A1A] text-white shadow-[0_8px_32px_-8px_rgba(255,122,0,0.55)] hover:shadow-[0_16px_48px_-12px_rgba(255,122,0,0.7)]"
      : "bg-white/5 hover:bg-white/10 text-white border border-white/12 hover:border-white/25";

  const Comp = href ? "a" : "button";
  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} className="inline-block">
      <Comp
        {...(rest as Record<string, unknown>)}
        href={href}
        onClick={onClick}
        className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-[15px] tracking-tight transition-colors duration-150 ${baseClasses} ${className}`}
        data-cursor="hot"
      >
        {children}
      </Comp>
    </motion.div>
  );
}

// ─── Count-up: animates from 0 → target on intersection ──────────────────
export function CountUp({
  to,
  duration = 1400,
  suffix = "",
  prefix = "",
  format = (n: number) => n.toLocaleString(),
}: {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const reduced = useReduced();
  const fired = useRef(false);

  useEffect(() => {
    if (reduced) {
      setVal(to);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (fired.current) return;
        if (entries[0].isIntersecting) {
          fired.current = true;
          const start = performance.now();
          const step = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            // easeOutExpo
            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            setVal(Math.round(to * eased));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{format(val)}{suffix}
    </span>
  );
}

// ─── Ambient orbs — slow Lissajous-style drifting gradient blobs ──────────
export function AmbientOrbs() {
  const reduced = useReduced();
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,122,0,0.06),transparent_60%)]" />
      {!reduced && (
        <>
          <motion.div
            className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.25),transparent_70%)] blur-3xl"
            animate={{ x: [0, 120, -40, 0], y: [0, 60, -80, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -right-40 w-[44rem] h-[44rem] rounded-full bg-[radial-gradient(circle,rgba(80,80,255,0.18),transparent_70%)] blur-3xl"
            animate={{ x: [0, -80, 40, 0], y: [0, -60, 40, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 left-1/3 w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,170,80,0.10),transparent_70%)] blur-3xl"
            animate={{ x: [0, -120, 80, 0], y: [0, 100, -60, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {/* dot grid with radial fade */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1), rgba(0,0,0,0) 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1), rgba(0,0,0,0) 70%)",
        }}
      />
      {/* film grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "180px 180px",
        }}
      />
    </div>
  );
}

// ─── Verb rotator — cycles through verbs with vertical mask ──────────────
export function VerbRotator({
  words,
  interval = 2400,
  className = "",
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const reduced = useReduced();
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setI((p) => (p + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [reduced, interval, words.length]);

    return (
      <span className={`relative inline-block align-baseline ${className}`} style={{ lineHeight: "inherit" }}>
        {/* invisible spacer (current word) establishes width AND text baseline */}
        <span className="invisible" aria-hidden>
          {words[i]}
        </span>
        {/* clipping window for the slot-machine animation */}
        <span aria-hidden className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={words[i]}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="block bg-gradient-to-b from-[#FFB066] to-[#FF7A00] bg-clip-text text-transparent drop-shadow-[0_0_32px_rgba(255,122,0,0.35)]"
            >
              {words[i]}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    );
}

// ─── Pulse waveform — continuous scrolling ECG-style trace ────────────────
export function PulseWaveform({ className = "", color = "#FF7A00" }: { className?: string; color?: string }) {
  const reduced = useReduced();
  return (
    <svg viewBox="0 0 1200 80" className={`w-full h-full ${className}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="pulse-fade-l" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.15" stopColor={color} stopOpacity="0.8" />
          <stop offset="0.85" stopColor={color} stopOpacity="0.8" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="url(#pulse-fade-l)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0,40 H280 L300,40 L312,18 L324,62 L334,28 L344,40 H600 L620,40 L632,8 L644,72 L656,32 L666,40 H980 L1000,40 L1012,22 L1024,58 L1034,30 L1044,40 H1200">
          {!reduced && (
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to="-340 0"
              dur="3s"
              repeatCount="indefinite"
            />
          )}
        </path>
      </g>
    </svg>
  );
}

// ─── Logo marquee ────────────────────────────────────────────────────────
export function LogoMarquee({ logos }: { logos: string[] }) {
  const reduced = useReduced();
  return (
    <div className="relative overflow-hidden mask-fade-x">
      <motion.div
        className="flex gap-12 items-center w-max"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      >
        {[...logos, ...logos].map((name, i) => (
          <span
            key={i}
            className="text-white/40 hover:text-white/80 transition-colors font-semibold text-[20px] tracking-tight uppercase whitespace-nowrap"
            style={{ fontFamily: "var(--app-font-sans), sans-serif" }}
          >
            {name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
