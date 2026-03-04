import Link from "next/link";
import Glow from "@/components/common/Glow";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <Glow />

      {/* HERO */}
      <Section className="pt-14 md:pt-20">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <span className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_18px_rgba(168,85,247,.8)]" />
            Latest integration: real-time face emotion pipeline
          </div>
        </div>

        <div className="mt-10 text-center">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Boost learning quality with{" "}
            <span className="text-purple-600 dark:text-white/90">AI</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-white/60 text-base md:text-lg">
            ELAS — Emotion-Aware Learning Analytics System. Real-time engagement & stress analytics,
            ethical consent, reports and dashboards for students, teachers and admins.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth/login">
              <Button>Войти</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline">Регистрация</Button>
            </Link>
            <Link href="/privacy">
              <Button variant="ghost">Конфиденциальность</Button>
            </Link>
          </div>
        </div>

        {/* “Big dashboard mock” card */}
        <div className="mt-12">
          <GlassCard className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-600 dark:text-white/60">Обзор аналитики</div>
              <Badge>Пример</Badge>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <MiniKpi title="Visibility / Engagement" value="71.2%" hint="+3.1% this week" />
              <MiniKpi title="Avg Stress" value="38.6%" hint="Exam sessions only" />
              <MiniKpi title="Attention Drops" value="9" hint="Detected markers" />
            </div>

            <div className="mt-6 rounded-3xl border border-black/10 bg-slate-900/5 dark:border-white/10 dark:bg-black/30 p-5">
              <div className="text-sm text-slate-600 dark:text-white/60">Timeline (preview)</div>
              <div className="mt-4 h-36 rounded-2xl border border-white/10 bg-linear-to-b from-purple-500/20 to-transparent" />
              <div className="mt-3 text-xs text-slate-500 dark:text-white/45">
                В реальном режиме здесь отображается поток метрик по сессии.
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Logos / trust */}
        <div className="mt-12">
          <div className="text-center text-sm text-slate-500 dark:text-white/45">Trusted by innovative teams</div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Narxoz", "KnewIT", "ELAS Lab", "Digital Eng"].map((x) => (
              <div key={x} className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                {x}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* VALUE BLOCK */}
      <Section className="pt-0">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Harness AI to make learning analytics{" "}
            <span className="text-purple-600 dark:text-white/90">ethical</span> and{" "}
            <span className="text-purple-600 dark:text-white/90">actionable</span>.
          </h2>
          <p className="mt-4 text-slate-600 dark:text-white/60">
            No raw video storage. Consent-first flow. Teacher gets aggregated insights — not grading.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-4">
          <FeatureCard
            title="Consent-first"
            text="Student explicitly accepts consent before any analytics. Withdraw anytime."
            tag="Privacy"
          />
          <FeatureCard
            title="Live monitoring"
            text="Teacher sees group-level engagement/stress, quality indicators, notes timeline."
            tag="Realtime"
          />
          <FeatureCard
            title="Reports & comparison"
            text="Exportable reports, compare sessions, KPI dashboards for decision-making."
            tag="Analytics"
          />
        </div>

        {/* fancy two-row layout like your example */}
        <div className="mt-8 grid lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-1">
            <div className="text-sm text-slate-600 dark:text-white/60">SEO goal setting (analogy)</div>
            <div className="mt-2 text-lg font-semibold">Session goal settings</div>
            <p className="mt-2 text-slate-600 dark:text-white/60 text-sm">
              Set type (lecture/exam), fps, anonymization, then share code & link instantly.
            </p>
            <div className="mt-6 h-28 rounded-2xl border border-black/10 bg-slate-900/5 dark:border-white/10 dark:bg-black/30" />
          </GlassCard>

          <GlassCard className="p-6 lg:col-span-2">
            <div className="text-sm text-slate-600 dark:text-white/60">User-friendly dashboard</div>
            <div className="mt-2 text-lg font-semibold">Teacher analytics overview</div>
            <p className="mt-2 text-slate-600 dark:text-white/60 text-sm">
              Engagement timeline, stress peaks, insights feed, export modal, filters and tables.
            </p>
            <div className="mt-6 h-40 rounded-2xl border border-black/10 bg-linear-to-r from-purple-500/15 to-transparent dark:border-white/10" />
          </GlassCard>

          <GlassCard className="p-6 lg:col-span-2">
            <div className="text-sm text-slate-600 dark:text-white/60">Visual reports</div>
            <div className="mt-2 text-lg font-semibold">Charts & KPIs</div>
            <p className="mt-2 text-slate-600 dark:text-white/60 text-sm">
              Beautiful charts with consistent styling for demo and defence.
            </p>
            <div className="mt-6 h-40 rounded-2xl border border-black/10 bg-slate-900/5 dark:border-white/10 dark:bg-black/30" />
          </GlassCard>

          <GlassCard className="p-6 lg:col-span-1">
            <div className="text-sm text-slate-600 dark:text-white/60">Smart generator</div>
            <div className="mt-2 text-lg font-semibold">Auto insights</div>
            <p className="mt-2 text-slate-600 dark:text-white/60 text-sm">
              Generates summary + recommendations (mock now, real later).
            </p>
            <div className="mt-6 h-28 rounded-2xl border border-black/10 bg-slate-900/5 dark:border-white/10 dark:bg-black/30" />
          </GlassCard>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pt-0 pb-24">
        <GlassCard className="p-8 md:p-10 text-center">
          <div className="text-sm text-slate-600 dark:text-white/60">Готовы начать?</div>
          <div className="mt-2 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">
            Войдите или зарегистрируйтесь, чтобы пользоваться аналитикой и отчётами.
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/auth/login"><Button>Войти</Button></Link>
            <Link href="/auth/register"><Button variant="outline">Регистрация</Button></Link>
          </div>
        </GlassCard>
      </Section>
    </main>
  );
}

function MiniKpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-white/50">{hint}</div>
    </div>
  );
}

function FeatureCard({ title, text, tag }: { title: string; text: string; tag: string }) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{title}</div>
        <Badge>{tag}</Badge>
      </div>
      <p className="mt-3 text-white/60 text-sm leading-relaxed">{text}</p>
      <div className="mt-6 h-24 rounded-2xl border border-white/10 bg-black/30" />
    </GlassCard>
  );
}
