// Glassmorphism primitives for the landing page.
//
// Layer formula on every glass surface:
//   1. backdrop-blur(24px) saturate(180%)
//   2. tinted translucent fill (navy at 50-70%)
//   3. top inner-edge specular highlight
//   4. double-stroke border + bottom dark outer-shadow + drop shadow

import { type CSSProperties, useRef, useState, type PropsWithChildren } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

const GLASS_STYLES: CSSProperties = {
  // tinted fill + top inner-edge specular highlight in one image
  backgroundImage:
    "linear-gradient(180deg, hsla(220,32%,11%,0.7), hsla(220,32%,11%,0.5)), linear-gradient(180deg, hsla(0,0%,100%,0.06) 0%, hsla(0,0%,100%,0) 35%)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid hsla(0,0%,100%,0.08)",
  boxShadow:
    "inset 0 1px 0 hsla(0,0%,100%,0.05), 0 1px 0 hsla(0,0%,0%,0.4), 0 24px 48px -16px hsla(0,0%,0%,0.4)",
};

const GLASS_HOVER_STYLES: CSSProperties = {
  ...GLASS_STYLES,
  border: "1px solid hsla(29,100%,60%,0.25)",
  boxShadow:
    "inset 0 1px 0 hsla(0,0%,100%,0.08), 0 0 0 1px hsla(29,100%,60%,0.12), 0 32px 64px -16px hsla(29,100%,40%,0.25)",
};

export function GlassCard({
  children,
  className = "",
  style,
  ...rest
}: PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      {...rest}
      style={{ ...GLASS_STYLES, ...style }}
      className={`relative rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

// Vercel-style spotlight cursor on the card — a soft orange halo follows the
// mouse via a CSS radial-gradient mask anchored on (mouseX, mouseY).
export function SpotlightCard({
  children,
  className = "",
  size = 360,
}: PropsWithChildren<{ className?: string; size?: number }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [active, setActive] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        if (reduced) return;
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      style={active ? GLASS_HOVER_STYLES : GLASS_STYLES}
      className={`relative rounded-2xl overflow-hidden transition-[box-shadow,border-color] duration-300 ${className}`}
    >
      {/* spotlight layer */}
      {!reduced && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            opacity: active ? 1 : 0,
            background: `radial-gradient(${size}px circle at ${pos.x}px ${pos.y}px, rgba(255,122,0,0.18), transparent 60%)`,
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

// 3D tilt card — perspective + transform tracks mouseX/Y, max 8°.
export function TiltCard({
  children,
  className = "",
  intensity = 8,
}: PropsWithChildren<{ className?: string; intensity?: number }>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 18 });
  const sry = useSpring(ry, { stiffness: 220, damping: 18 });
  const shineX = useTransform(sry, [-intensity, intensity], ["10%", "90%"]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        if (reduced) return;
        const r = ref.current!.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width - 0.5;
        const cy = (e.clientY - r.top) / r.height - 0.5;
        rx.set(-cy * intensity);
        ry.set(cx * intensity);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{
        ...GLASS_STYLES,
        transformStyle: "preserve-3d",
        perspective: 1000,
        rotateX: srx,
        rotateY: sry,
      }}
      className={`relative rounded-2xl overflow-hidden ${className}`}
    >
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: useTransform(
              shineX,
              (v) =>
                `linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) ${v}, transparent 70%)`,
            ),
          }}
        />
      )}
      <div style={{ transform: "translateZ(40px)" }}>{children}</div>
    </motion.div>
  );
}

// Section header with eyebrow + bracket icon. Slides in from left on scroll.
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <p className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#FFB066]/90 font-semibold mb-4 ${align === "center" ? "" : ""}`}>
        <span className="inline-block h-px w-6 bg-[#FFB066]/50" />
        {eyebrow}
      </p>
      <h2 className="text-[clamp(40px,5.5vw,72px)] leading-[0.95] tracking-[-0.025em] font-extrabold text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-[18px] leading-[1.6] text-white/65 font-normal">{subtitle}</p>
      )}
    </motion.div>
  );
}
