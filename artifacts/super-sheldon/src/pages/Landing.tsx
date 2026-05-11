import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Play,
  Radio,
  HeartPulse,
  Activity,
  Sparkles,
  TrendingDown,
  Users,
  Building2,
  Wand2,
  CheckCircle2,
  Lock,
  Shield,
  Globe,
  ChevronRight,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import {
  CustomCursor,
  MagneticButton,
  CountUp,
  AmbientOrbs,
  VerbRotator,
  PulseWaveform,
  LogoMarquee,
} from "@/components/landing/effects";
import {
  GlassCard,
  SpotlightCard,
  TiltCard,
  SectionHeader,
} from "@/components/landing/primitives";
import ClassPulseLogo from "@/components/ClassPulseLogo";

export default function Landing() {
  const [, setLocation] = useLocation();

  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("lp-page");
    return () => {
      document.body.classList.remove("lp-page");
    };
  }, []);

  const go = (to: string) => () => setLocation(to);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden font-sans isolate">
      {/* page background layer — sits behind ambient orbs so the glow shows through */}
      <div aria-hidden className="fixed inset-0 -z-20" style={{ background: "hsl(220 38% 7%)" }} />
      <CustomCursor />
      <AmbientOrbs />

      {/* sticky glass nav */}
      <Nav onGetStarted={go("/login")} />

      <main className="relative z-0">
        <Hero onPrimary={go("/login")} onSecondary={go("/login")} />
        <MetricsBar />
        <Trusted />
        <ProblemSection />
        <FeaturesGrid />
        <AudienceShowcase />
        <HowItWorks />
        <AIEngine />
        <Testimonials />
        <ComplianceStrip />
        <FinalCTA onPrimary={go("/login")} />
        <Footer />
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// NAV
// ──────────────────────────────────────────────────────────────────────────

function Nav({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5"
      style={{ background: "hsla(220, 38%, 7%, 0.55)" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5">
          <ClassPulseLogo size={28} />
          <span className="font-bold text-[15px] tracking-tight">ClassPulse <span className="text-white/40 font-medium">AI</span></span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-[14px] font-medium text-white/65">
          {["Product", "Features", "For Teams"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`} className="hover:text-white transition-colors">
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <MagneticButton onClick={onGetStarted} className="text-[13px] py-2 px-4">
            Get started
            <ArrowRight className="w-3.5 h-3.5" />
          </MagneticButton>
        </div>
      </div>
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// HERO
// ──────────────────────────────────────────────────────────────────────────

function Hero({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  return (
    <section className="relative pt-20 lg:pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
        {/* text block */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] mb-7"
            style={{
              background: "linear-gradient(90deg, hsla(29,100%,50%,0.12), hsla(29,100%,50%,0.04))",
              border: "1px solid hsla(29,100%,60%,0.25)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Live · Powered by Azure GPT-5.1
          </motion.div>

          <h1
            className="text-[clamp(48px,8.5vw,140px)] font-black text-white"
            style={{
              lineHeight: 0.93,
              letterSpacing: "-0.04em",
            }}
          >
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <VerbRotator words={["See", "Hear", "Predict", "Save"]} /> every
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">classroom</span> pulse.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-7 text-[18px] lg:text-[19px] leading-[1.55] text-white/65 font-normal max-w-[36rem]"
          >
            Real-time engagement, confusion radar, mood timeline and churn prediction for online tutoring — so you fix the lesson before the parent calls.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <MagneticButton onClick={onPrimary}>
              Get started
              <ArrowRight className="w-4 h-4" />
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={onSecondary}>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15">
                <Play className="w-2.5 h-2.5 fill-white text-white" />
              </span>
              Watch 90-sec tour
            </MagneticButton>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 text-[13px] text-white/40 font-medium"
          >
            Trusted by EdTech teams monitoring{" "}
            <span className="text-white/80 font-semibold tabular-nums">24,332+</span> tutoring sessions across 12 countries.
          </motion.p>
        </div>

        {/* hero mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateY: -10 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <HeroMockup />
        </motion.div>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative" style={{ transform: "perspective(1400px) rotateY(-8deg) rotateX(4deg)" }}>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <GlassCard className="overflow-hidden shadow-[0_40px_120px_-30px_rgba(255,122,0,0.45)]">
          {/* fake browser top bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
            </div>
            <div className="ml-3 text-[11px] text-white/40 font-mono">classpulse.ai/dashboard</div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </div>
          </div>

          {/* pulse strip across top */}
          <div className="h-12 border-b border-white/5 px-4 flex items-center">
            <PulseWaveform />
          </div>

          {/* dashboard content */}
          <div className="p-5 grid grid-cols-3 gap-3 bg-gradient-to-b from-transparent to-black/20">
            {[
              { label: "Engagement", val: 84, color: "from-emerald-500/30 to-emerald-500/0", txt: "text-emerald-300" },
              { label: "Confusion", val: 64, color: "from-orange-500/30 to-orange-500/0", txt: "text-orange-300" },
              { label: "Understanding", val: 78, color: "from-sky-500/30 to-sky-500/0", txt: "text-sky-300" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl p-3 border border-white/8" style={{ background: "hsla(220,28%,16%,0.5)" }}>
                <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">{m.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <div className="text-2xl font-bold tabular-nums">{m.val}</div>
                  <div className="text-[10px] text-white/40">/ 100</div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${m.color.replace("/0", "/100")} ${m.txt}`} style={{ width: m.val + "%" }} />
                </div>
              </div>
            ))}
          </div>

          {/* chart area */}
          <div className="p-5 pt-1">
            <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-2">Mood Timeline · Last 45 min</div>
            <div className="h-32 relative">
              <svg viewBox="0 0 600 120" className="w-full h-full">
                <defs>
                  <linearGradient id="hm-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#FF7A00" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#FF7A00" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,80 C60,70 90,50 150,55 S240,40 300,60 S420,90 480,70 S570,40 600,30 L600,120 L0,120 Z" fill="url(#hm-fill)" />
                <path d="M0,80 C60,70 90,50 150,55 S240,40 300,60 S420,90 480,70 S570,40 600,30" stroke="#FF7A00" strokeWidth="2.5" fill="none" />
                {[100, 250, 400, 500].map((x) => (
                  <circle key={x} cx={x} cy={x === 250 ? 60 : x === 400 ? 70 : x === 100 ? 55 : 30} r="3" fill="#FF7A00" />
                ))}
              </svg>
            </div>
          </div>

          {/* footer with AI suggestion chip */}
          <div className="px-5 py-3 border-t border-white/5 flex items-center gap-3 text-[12px]">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-orange-400" />
            </div>
            <div className="text-white/65">
              <span className="text-orange-300 font-semibold">Class Rescue:</span> Re-derive the power rule with a concrete example before moving on.
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* floating badges around the mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.7 },
          scale: { duration: 0.6, delay: 0.7 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.7 },
        }}
        className="absolute -left-6 top-1/3 hidden md:block"
      >
        <GlassCard className="px-3 py-2 flex items-center gap-2 text-[12px]">
          <HeartPulse className="w-4 h-4 text-rose-400" />
          <span className="font-semibold">Churn alert</span>
          <span className="text-white/50">·</span>
          <span className="text-white/70">Liam Chen</span>
        </GlassCard>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.9 },
          scale: { duration: 0.6, delay: 0.9 },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.9 },
        }}
        className="absolute -right-4 -bottom-4 hidden md:block"
      >
        <GlassCard className="px-3 py-2 flex items-center gap-2 text-[12px]">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="font-semibold">Report ready</span>
          <span className="text-white/50">·</span>
          <span className="text-white/70 tabular-nums">82 / 100</span>
        </GlassCard>
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// METRICS BAR
// ──────────────────────────────────────────────────────────────────────────

function MetricsBar() {
  const items = [
    { v: 24332, label: "sessions analyzed" },
    { v: 135, label: "teachers monitored" },
    { v: 583, label: "students tracked" },
    { v: 12, label: "second avg response", suffix: "s" },
    { v: 99.95, label: "uptime", suffix: "%", format: (n: number) => n.toFixed(2) },
  ];
  return (
    <section className="border-y border-white/5 mt-8" style={{ background: "hsla(220,32%,9%,0.45)" }}>
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-5 gap-6">
        {items.map((it, i) => (
          <div key={i} className={i > 0 ? "md:pl-6 md:border-l border-white/8" : ""}>
            <div className="text-[clamp(28px,3.5vw,40px)] font-extrabold tracking-tight text-white tabular-nums">
              <CountUp to={it.v} suffix={it.suffix} format={it.format} />
            </div>
            <div className="text-[12px] text-white/50 mt-1 font-medium">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TRUSTED MARQUEE
// ──────────────────────────────────────────────────────────────────────────

function Trusted() {
  return (
    <section className="py-12">
      <p className="text-center text-[11px] uppercase tracking-[0.22em] text-white/35 font-semibold mb-7">
        Trusted by EdTech teams operating in 12 countries
      </p>
      <LogoMarquee logos={["SuperSheldon", "WiseEdu", "TutorLoop", "BrightPath", "Polaris", "Foundry", "OneStudio", "Acadex"]} />
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PROBLEM
// ──────────────────────────────────────────────────────────────────────────

function ProblemSection() {
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#FFB066]/90 font-semibold mb-5">The problem</p>
          <h2 className="text-[clamp(34px,4.5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
            Online tutoring is <span className="italic text-white/55">flying blind.</span>
          </h2>
          <p className="mt-6 text-white/65 leading-[1.6] text-[17px]">
            By the time a parent complains, the student's already half-gone. Engagement dies silently. Confusion lingers unspoken. Churn arrives without warning.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Activity, label: "Engagement dies silently" },
            { icon: HeartPulse, label: "Confusion lingers unspoken" },
            { icon: TrendingDown, label: "Churn arrives without warning" },
          ].map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <GlassCard className="p-5 h-full">
                <div className="w-10 h-10 rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center mb-3">
                  <it.icon className="w-5 h-5" />
                </div>
                <p className="text-[13px] font-semibold text-white/85">{it.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// FEATURES
// ──────────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Radio, title: "Confusion Radar", desc: "Live confusion detection during class with extracted student signals." },
  { icon: HeartPulse, title: "Mood Timeline", desc: "Per-minute emotional energy plus valence — see exactly when energy dipped." },
  { icon: Activity, title: "Engagement Pulse", desc: "Voice, interaction, dead-air and noise scores synthesised in real time." },
  { icon: Sparkles, title: "Class Rescue AI", desc: "GPT-5.1 generates an intervention prompt the moment confusion spikes." },
  { icon: TrendingDown, title: "Churn Prediction", desc: "Per-student risk score with reasons and trend signals — not a black box." },
  { icon: Users, title: "Parent Insights", desc: "Plain-English progress narratives, strengths, weak areas and weekly action items." },
  { icon: Building2, title: "Admin Oversight", desc: "Cross-teacher retention, KPI rankings, churn alerts in one panel." },
  { icon: Wand2, title: "Custom Class Capture", desc: "One-click ad-hoc session monitoring — no scheduling required." },
];

function FeaturesGrid() {
  return (
    <section id="features" className="py-28">
      <SectionHeader
        eyebrow="What's inside"
        title={
          <>
            Eight signals that turn{" "}
            <span className="bg-gradient-to-b from-[#FFB066] to-[#FF7A00] bg-clip-text text-transparent">tutoring into telemetry.</span>
          </>
        }
        subtitle="Every minute of a session generates a stream of behavioural signals. ClassPulse turns those signals into the seven decisions you make every week."
      />
      <div className="max-w-7xl mx-auto px-6 mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <SpotlightCard className="p-6 h-full">
              <div className="w-12 h-12 rounded-xl bg-[#FF7A00]/12 ring-1 ring-[#FF7A00]/25 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#FFB066]" />
              </div>
              <h3 className="text-[20px] font-bold tracking-tight mb-2">{f.title}</h3>
              <p className="text-[14px] text-white/55 leading-[1.55]">{f.desc}</p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// AUDIENCE
// ──────────────────────────────────────────────────────────────────────────

function AudienceShowcase() {
  const blocks = [
    {
      name: "For Teachers",
      halo: "rgba(255,122,0,0.35)",
      title: "Coach yourself, mid-class.",
      points: [
        "AI confusion radar surfaces the exact moment students lost the thread",
        "Class Rescue prompts you'd never ask out loud",
        "Post-class report with mood timeline + per-minute scores",
      ],
      preview: <TeacherPreview />,
    },
    {
      name: "For Parents & Students",
      halo: "rgba(244, 114, 182, 0.32)",
      title: "Know exactly how this week went.",
      points: [
        "Score rings for engagement, understanding, confidence",
        "Strengths + areas to support in plain language",
        "Three concrete recommendations for the week ahead",
      ],
      preview: <ParentPreview />,
    },
    {
      name: "For EdTech Operators",
      halo: "rgba(52, 211, 153, 0.32)",
      title: "Retention is finally a dashboard.",
      points: [
        "Cross-teacher KPIs ranked by churn risk",
        "Risk distribution chart per cohort, refreshed live",
        "Per-student alerts long before parents complain",
      ],
      preview: <AdminPreview />,
    },
  ];
  return (
    <section id="for-teams" className="py-28 relative">
      <SectionHeader
        eyebrow="Built for three audiences"
        title={<>One platform. <span className="text-white/55">Three jobs done.</span></>}
        subtitle="ClassPulse renders a different surface for the teacher, the parent, and the operator — keyed to the same signal stream."
      />
      <div className="max-w-7xl mx-auto px-6 mt-14 grid lg:grid-cols-3 gap-6">
        {blocks.map((b, i) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* halo */}
            <div className="absolute -inset-6 rounded-3xl blur-3xl opacity-50" style={{ background: `radial-gradient(circle, ${b.halo}, transparent 65%)` }} />
            <TiltCard className="p-6 h-full">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#FFB066]/90 font-semibold mb-2">{b.name}</p>
              <h3 className="text-[clamp(22px,2.3vw,30px)] font-bold tracking-tight mb-5">{b.title}</h3>
              <div className="mb-5">{b.preview}</div>
              <ul className="space-y-2.5">
                {b.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[13.5px] text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TeacherPreview() {
  return (
    <div className="rounded-xl p-4 border border-white/8 mb-1" style={{ background: "hsla(220,28%,16%,0.5)" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">AI Performance Trend</span>
        <span className="text-[10px] text-emerald-400">▲ +12.5%</span>
      </div>
      <svg viewBox="0 0 200 60" className="w-full h-12">
        <path d="M0,40 L25,35 L50,30 L75,32 L100,20 L125,15 L150,12 L175,8 L200,5" stroke="#FF7A00" strokeWidth="2" fill="none" />
        <path d="M0,40 L25,35 L50,30 L75,32 L100,20 L125,15 L150,12 L175,8 L200,5 L200,60 L0,60 Z" fill="rgba(255,122,0,0.18)" />
      </svg>
    </div>
  );
}

function ParentPreview() {
  return (
    <div className="rounded-xl p-4 border border-white/8 mb-1 flex gap-2" style={{ background: "hsla(220,28%,16%,0.5)" }}>
      {[
        { lbl: "Engagement", v: 84, c: "#FF7A00" },
        { lbl: "Learning", v: 78, c: "#22d3ee" },
        { lbl: "Confidence", v: 81, c: "#a78bfa" },
      ].map((r) => (
        <div key={r.lbl} className="flex-1 flex flex-col items-center">
          <svg viewBox="0 0 36 36" className="w-12 h-12">
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke={r.c} strokeWidth="3"
              strokeDasharray={`${(r.v / 100) * 88} 88`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div className="text-[16px] font-bold mt-1 tabular-nums">{r.v}</div>
          <div className="text-[9px] uppercase tracking-wider text-white/45">{r.lbl}</div>
        </div>
      ))}
    </div>
  );
}

function AdminPreview() {
  const buckets = [
    { lbl: "Low", v: 60, c: "#FFB066" },
    { lbl: "Med", v: 22, c: "#FF9233" },
    { lbl: "High", v: 12, c: "#FF7A00" },
    { lbl: "Crit", v: 6, c: "#E55F00" },
  ];
  return (
    <div className="rounded-xl p-4 border border-white/8 mb-1" style={{ background: "hsla(220,28%,16%,0.5)" }}>
      <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-3">Risk Distribution</div>
      <div className="flex items-end gap-2 h-16">
        {buckets.map((b) => (
          <div key={b.lbl} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-md" style={{ height: `${b.v * 1.4}%`, background: b.c }} />
            <div className="text-[9px] text-white/50 font-medium">{b.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// HOW IT WORKS
// ──────────────────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: "01", t: "Capture", d: "Mic, screen and chat captured live during the lesson." },
    { n: "02", t: "Analyze", d: "GPT-5.1 scores engagement, confusion and mood every minute." },
    { n: "03", t: "Predict", d: "Churn signals and intervention prompts surface in real time." },
    { n: "04", t: "Act", d: "Ready-to-ship reports for teacher, parent and admin." },
  ];
  return (
    <section className="py-28">
      <SectionHeader eyebrow="How it works" title={<>From mic to <span className="text-white/55">measurable</span> in 12 seconds.</>} />
      <div className="max-w-6xl mx-auto px-6 mt-14 relative">
        <div className="absolute left-0 right-0 top-12 h-px hidden md:block" style={{ background: "linear-gradient(90deg, transparent, rgba(255,122,0,0.3), transparent)" }} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-12 w-3 h-3 rounded-full bg-[#FF7A00] ring-4 ring-[#FF7A00]/20" />
              <GlassCard className="p-6 mt-20 md:mt-20">
                <div className="font-mono text-[12px] text-[#FFB066]/80 mb-2 tracking-wider">{s.n}</div>
                <h3 className="text-[22px] font-bold tracking-tight mb-2">{s.t}</h3>
                <p className="text-[14px] text-white/55 leading-[1.55]">{s.d}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// AI ENGINE
// ──────────────────────────────────────────────────────────────────────────

function AIEngine() {
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#FFB066]/90 font-semibold mb-5">The engine</p>
          <h2 className="text-[clamp(34px,4.5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
            Powered by <br />
            <span className="bg-gradient-to-r from-white via-[#FFB066] to-[#FF7A00] bg-clip-text text-transparent">Azure OpenAI GPT-5.1.</span>
          </h2>
          <p className="mt-5 text-white/65 leading-[1.6] text-[17px]">
            Every transcript chunk passes through the same model that powers ClassPulse's confusion radar, mood detection and parent-report generation. JSON-strict outputs. ~12-second median latency.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              "Structured JSON outputs for downstream automation",
              "Azure-hosted with private endpoint isolation",
              "FERPA-aware prompt design — no PII leaks back",
              "Falls back to a heuristic simulator when offline",
            ].map((l) => (
              <li key={l} className="flex gap-3 text-[14px] text-white/75">
                <CheckCircle2 className="w-4 h-4 text-[#FF7A00] mt-1 shrink-0" />
                {l}
              </li>
            ))}
          </ul>
        </div>
        <GlassCard className="p-8 relative overflow-hidden">
          {/* radial neural network sketch */}
          <svg viewBox="0 0 320 280" className="w-full h-auto">
            <defs>
              <radialGradient id="nn-core" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#FF7A00" stopOpacity="0.8" />
                <stop offset="1" stopColor="#FF7A00" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="160" cy="140" r="80" fill="url(#nn-core)" />
            {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg, i) => {
              const r = 110;
              const rad = (deg * Math.PI) / 180;
              const x = 160 + Math.cos(rad) * r;
              const y = 140 + Math.sin(rad) * r;
              return (
                <g key={i}>
                  <line x1="160" y1="140" x2={x} y2={y} stroke="rgba(255,122,0,0.25)" strokeWidth="1" />
                  <circle cx={x} cy={y} r="4" fill="#FFB066">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
            <circle cx="160" cy="140" r="6" fill="#fff" />
          </svg>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[{ k: "12s", l: "median" }, { k: "JSON", l: "outputs" }, { k: "5.1", l: "GPT version" }].map((m) => (
              <div key={m.l}>
                <div className="text-[22px] font-bold tabular-nums">{m.k}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/45">{m.l}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TESTIMONIALS
// ──────────────────────────────────────────────────────────────────────────

function Testimonials() {
  const quotes = [
    {
      text: "We caught a churn signal 11 days before the parent complained. That alone paid for the year.",
      who: "Priya Sharma",
      role: "Head of Academics, BrightPath Tutors",
    },
    {
      text: "Our teachers love the Class Rescue prompts. It's the post-class debrief they never had time to do.",
      who: "Marcus Webb",
      role: "Director of Tutor Operations, WiseEdu",
    },
    {
      text: "Replaced three dashboards with one. Retention chart, parent narratives, teacher KPIs — all live.",
      who: "Ana Costa",
      role: "COO, OneStudio Learning",
    },
  ];
  return (
    <section className="py-28">
      <SectionHeader eyebrow="What operators are saying" title={<>Teams that <span className="text-white/55">measure</span> stop guessing.</>} />
      <div className="max-w-6xl mx-auto px-6 mt-14 grid md:grid-cols-3 gap-5">
        {quotes.map((q, i) => (
          <motion.div
            key={q.who}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="text-[44px] leading-none text-[#FF7A00]/40 font-bold mb-2">"</div>
              <p className="text-[15px] leading-[1.6] text-white/85 mb-5">{q.text}</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FFB066] flex items-center justify-center font-bold text-white text-sm">
                  {q.who.charAt(0)}
                </div>
                <div>
                  <div className="text-[13px] font-semibold">{q.who}</div>
                  <div className="text-[11px] text-white/50">{q.role}</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// COMPLIANCE
// ──────────────────────────────────────────────────────────────────────────

function ComplianceStrip() {
  const badges = [
    { icon: Shield, l: "SOC 2 Type II" },
    { icon: Lock, l: "GDPR ready" },
    { icon: Lock, l: "FERPA aware" },
    { icon: Globe, l: "EU + US data residency" },
  ];
  return (
    <section className="py-14">
      <div className="max-w-5xl mx-auto px-6">
        <GlassCard className="px-6 py-5 flex flex-wrap justify-center items-center gap-6">
          {badges.map((b) => (
            <div key={b.l} className="flex items-center gap-2.5 text-[13px] text-white/65 font-medium">
              <b.icon className="w-4 h-4 text-[#FFB066]" />
              {b.l}
            </div>
          ))}
        </GlassCard>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// FINAL CTA
// ──────────────────────────────────────────────────────────────────────────

function FinalCTA({ onPrimary }: { onPrimary: () => void }) {
  return (
    <section className="py-32 relative">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(40px,7vw,96px)] font-black leading-[0.95] tracking-[-0.035em]"
        >
          Don't lose another student to{" "}
          <span className="bg-gradient-to-b from-[#FFB066] to-[#FF7A00] bg-clip-text text-transparent">silent disengagement.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-7 text-[18px] text-white/60"
        >
          Book a 20-minute demo. We'll show you your own data.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <MagneticButton onClick={onPrimary} className="text-base px-8 py-4">
            Get started
            <ChevronRight className="w-4 h-4" />
          </MagneticButton>
          <p className="text-[12px] text-white/40 font-medium">No credit card. Live in 24 hours.</p>
        </motion.div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// FOOTER
// ──────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 mt-8 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <ClassPulseLogo size={28} />
            <span className="font-bold text-[15px] tracking-tight">ClassPulse AI</span>
          </div>
          <p className="text-[13px] text-white/50 max-w-sm leading-relaxed">
            Real-time classroom intelligence for online 1-on-1 tutoring. Built for teachers, parents and operators who measure what matters.
          </p>
          <div className="flex gap-3 mt-5">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors" data-cursor="hot">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          { h: "Product", items: ["Features", "Demo", "Changelog"] },
          { h: "Company", items: ["About", "Blog", "Careers", "Press"] },
          { h: "Resources", items: ["API", "Status", "Help"] },
          { h: "Legal", items: ["Privacy", "Terms", "Security", "FERPA"] },
        ].map((c) => (
          <div key={c.h}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold mb-4">{c.h}</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/65">
              {c.items.map((i) => (
                <li key={i}>
                  <a href="#" className="hover:text-white transition-colors">{i}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-14 pt-6 border-t border-white/5 flex flex-wrap justify-between gap-4 text-[12px] text-white/35">
        <div>© 2026 ClassPulse AI. Built with care.</div>
        <div className="font-mono">v0.3.0 · Azure GPT-5.1</div>
      </div>
    </footer>
  );
}
