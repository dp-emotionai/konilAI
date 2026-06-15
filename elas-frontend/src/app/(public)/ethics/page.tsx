import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  Globe2,
  GraduationCap,
  Heart,
  Shield,
  Target,
} from "lucide-react";

const SECTIONS = [
  { id: "purpose", label: "Purpose" },
  { id: "limits", label: "What we don’t do" },
  { id: "model", label: "About the model" },
] as const;

const LIMITS = [
  "Not used for grades, penalties, or disciplinary actions.",
  "Not used to judge or label individuals.",
  "Only aggregated, anonymized analytics for improving teaching and session quality.",
] as const;

export default function Ethics() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-violet-100/80 bg-[radial-gradient(circle_at_80%_8%,rgba(139,92,246,0.16),transparent_26%),linear-gradient(135deg,#ffffff_0%,#fbfaff_58%,#f5f1ff_100%)] px-4 py-7 shadow-[0_20px_70px_rgba(88,57,180,0.08)] sm:px-7 md:px-10 md:py-10 lg:px-12">
      <Decorations />

      <div className="relative z-10">
        <header className="grid items-center gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1.5 text-sm font-semibold text-violet-600 shadow-sm">
              <Globe2 size={15} aria-hidden="true" />
              Public
            </div>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[58px] lg:leading-[1.05]">
              Ethics &amp; Responsible AI
            </h1>
            <p className="mt-4 text-base font-medium text-slate-600 sm:text-lg">
              This system is not for grading or punishment.
            </p>
          </div>

          <HeroIllustration />
        </header>

        <nav
          aria-label="On this page"
          className="mt-8 inline-flex max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur"
        >
          {SECTIONS.map(({ id, label }, index) => (
            <a
              key={id}
              href={`#${id}`}
              className={
                index === 0
                  ? "relative whitespace-nowrap rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-600 shadow-sm after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-violet-500"
                  : "whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
              }
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-2 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/95 px-5 shadow-[0_18px_55px_rgba(30,41,59,0.08)] backdrop-blur sm:px-7 lg:px-9">
          <section
            id="purpose"
            className="grid scroll-mt-28 gap-5 border-b border-slate-100 py-7 md:grid-cols-[88px_1fr] md:py-8"
          >
            <SectionIcon>
              <Target size={34} strokeWidth={1.8} />
            </SectionIcon>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Purpose</h2>
              <p className="mt-2 max-w-5xl text-[15px] leading-7 text-slate-600">
                KonilAI is designed to support teaching and learning. We provide aggregated analytics on engagement and
                emotional signals so that educators can improve lectures and better support students. Results are
                <strong className="font-semibold text-slate-900"> not</strong> used for automatic grading, ranking, or
                formal assessment.
              </p>
            </div>
          </section>

          <section
            id="limits"
            className="grid scroll-mt-28 gap-5 border-b border-slate-100 py-7 md:grid-cols-[88px_1fr] md:py-8"
          >
            <SectionIcon>
              <Shield size={34} strokeWidth={1.8} />
            </SectionIcon>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">What we do not do</h2>
              <div className="mt-3 max-w-4xl space-y-2.5">
                {LIMITS.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.035)]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-400 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)]">
                      <Check size={13} strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="model"
            className="grid scroll-mt-28 gap-5 py-7 md:grid-cols-[88px_1fr] md:py-8"
          >
            <SectionIcon>
              <BrainCircuit size={34} strokeWidth={1.8} />
            </SectionIcon>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">About the model</h2>
              <p className="mt-2 max-w-5xl text-[15px] leading-7 text-slate-600">
                Emotion and engagement models can be wrong. Treat results as supportive signals, not ground truth. We
                log model performance and allow configuration so institutions can align the system with their ethical
                goals.
              </p>
              <Link
                href="/privacy#consent"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-5 py-2.5 text-sm font-semibold text-violet-600 shadow-sm transition hover:border-violet-400 hover:bg-violet-50"
              >
                Privacy &amp; consent
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-violet-100 bg-[linear-gradient(145deg,#f5f0ff,#ffffff)] text-violet-600 shadow-[0_12px_30px_rgba(124,58,237,0.12)]">
      {children}
    </div>
  );
}

function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto hidden h-[220px] w-full max-w-[420px] items-center justify-center lg:flex"
    >
      <div className="absolute inset-x-6 top-3 h-44 rounded-[50%] border border-dashed border-violet-200/80" />
      <div className="absolute left-4 top-24 flex h-20 w-20 items-end justify-center rounded-2xl border border-violet-100 bg-white/80 p-4 text-violet-500 shadow-[0_16px_35px_rgba(124,58,237,0.12)] backdrop-blur">
        <BarChart3 size={45} strokeWidth={1.8} />
      </div>
      <div className="relative z-10 flex h-36 w-32 items-center justify-center rounded-[38px] border border-violet-200 bg-[linear-gradient(145deg,#ffffff,#ede5ff)] text-violet-500 shadow-[0_20px_50px_rgba(124,58,237,0.18)]">
        <Shield size={88} strokeWidth={1.25} />
        <Heart className="absolute" size={38} fill="currentColor" strokeWidth={1.2} />
      </div>
      <div className="absolute bottom-2 right-2 flex h-24 w-36 items-center justify-center rounded-3xl border border-violet-100 bg-white/85 text-violet-700 shadow-[0_16px_35px_rgba(124,58,237,0.14)] backdrop-blur">
        <GraduationCap size={72} strokeWidth={1.3} />
      </div>
    </div>
  );
}

function Decorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-8 bottom-12 h-28 w-28 rounded-full bg-[radial-gradient(circle,#c4b5fd_1.5px,transparent_1.7px)] [background-size:12px_12px] opacity-40" />
      <div className="absolute -right-6 -top-8 h-44 w-44 rounded-full bg-violet-200/25 blur-2xl" />
      <div className="absolute -bottom-20 right-14 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl" />
    </div>
  );
}
