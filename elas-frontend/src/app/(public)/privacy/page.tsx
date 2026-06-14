import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Database,
  Download,
  ShieldCheck,
  UserRoundCheck,
  Users,
  Video,
} from "lucide-react";
import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";

const SECTIONS = [
  {
    id: "capture",
    label: "What we capture",
    icon: Video,
    title: "What we capture",
    body:
        "We capture frames (images) from your webcam at a low rate (1–2 per second), not continuous video. These frames are used only for real-time emotion and engagement analysis. No video recording is stored.",
  },
  {
    id: "storage",
    label: "What we store",
    icon: Database,
    title: "What we store",
    body:
        "We do not store raw video or images. We store only metadata: aggregated emotion metrics, engagement scores, and timestamps for analytics and reports. Data is anonymized in group-level views.",
  },
  {
    id: "access",
    label: "Who can access",
    icon: Users,
    title: "Who can access",
    body:
        "Access is role-based. Students see only their own summary if they opt in. Teachers see aggregated analytics for their groups and sessions. Administrators manage users and system settings. We do not share data with third parties for marketing or non-educational purposes.",
  },
  {
    id: "retention",
    label: "Retention",
    icon: CalendarDays,
    title: "Retention",
    body:
        "Retention policy is configurable by your institution. You can request deletion of your data; we will process it in line with applicable regulations such as GDPR.",
  },
  {
    id: "consent",
    label: "Your consent",
    icon: ShieldCheck,
    title: "Your consent",
    body:
        "Participation in video-based analytics requires your explicit consent. You can give or withdraw consent at any time in the Consent Center. Without consent, no frames are captured or analyzed.",
  },
] as const;

export default function Privacy() {
  return (
      <div className="relative -mx-4 -my-6 min-h-[calc(100vh-80px)] overflow-hidden px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_34%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full border border-purple-200/60 opacity-40" />
        <div className="pointer-events-none absolute bottom-8 left-8 -z-10 h-56 w-56 rounded-full border border-purple-200/50 opacity-40" />

        <div className="mx-auto max-w-7xl space-y-7">
          <PageTitle
              overline="Public"
              title="Privacy Policy"
              subtitle="What we capture, what we store, and who can access it."
          />

          <nav aria-label="On this page" className="flex flex-wrap gap-3">
            {SECTIONS.map(({ id, label, icon: Icon }, index) => (
                <a
                    key={id}
                    href={`#${id}`}
                    className={[
                      "inline-flex items-center gap-3 rounded-full border px-6 py-3 text-sm font-semibold transition",
                      index === 0
                          ? "border-purple-200 bg-purple-100 text-[#7448FF] shadow-sm"
                          : "border-slate-200 bg-white/80 text-slate-700 shadow-sm hover:border-purple-200 hover:bg-purple-50 hover:text-[#7448FF]",
                    ].join(" ")}
                >
              <span className="grid h-8 w-8 place-items-center rounded-2xl bg-white/70 text-[#7448FF]">
                <Icon size={18} />
              </span>
                  {label}
                </a>
            ))}
          </nav>

          <Card className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
            <div className="space-y-3">
              {SECTIONS.map(({ id, icon: Icon, title, body }) => (
                  <section
                      key={id}
                      id={id}
                      className="scroll-mt-24 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-purple-100 hover:shadow-md sm:px-6"
                  >
                    <div className="flex items-center gap-5">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-purple-50 text-[#7448FF]">
                        <Icon size={24} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-slate-950">
                          {title}
                        </h2>
                        <p className="mt-1 max-w-5xl text-sm leading-relaxed text-slate-600">
                          {body}
                        </p>
                      </div>

                      <ChevronDown
                          size={18}
                          className="hidden shrink-0 text-slate-500 sm:block"
                      />
                    </div>
                  </section>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-[24px] bg-white pt-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                    href="/consent"
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#7448FF] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(116,72,255,0.28)] transition hover:bg-[#6538f5]"
                >
                  <ShieldCheck size={18} />
                  Open Consent Center
                </Link>

                <Link
                    href="/privacy"
                    className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-[#7448FF]"
                >
                  <Download size={18} />
                  Download policy
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <UserRoundCheck size={18} className="text-emerald-600" />
                <span>Your consent status:</span>
                <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                Consented
              </span>
                <Link
                    href="/consent"
                    className="ml-0 font-semibold text-[#7448FF] hover:text-[#6538f5] sm:ml-6"
                >
                  Manage consent
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
  );
}