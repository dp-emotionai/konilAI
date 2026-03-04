import Link from "next/link";
import PageTitle from "@/components/common/PageTitle";
import {Card} from "@/components/ui/Card";

const SECTIONS = [
  { id: "capture", label: "What we capture" },
  { id: "storage", label: "What we store" },
  { id: "access", label: "Who can access" },
  { id: "retention", label: "Retention" },
  { id: "consent", label: "Your consent" },
] as const;

export default function Privacy() {
  return (
    <div className="space-y-8">
      <PageTitle
        overline="Public"
        title="Privacy Policy"
        subtitle="What we capture, what we store, and who can access it."
      />

      <nav aria-label="On this page" className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            {label}
          </a>
        ))}
      </nav>

      <Card className="p-6 md:p-8 space-y-8 text-white/80">
        <section id="capture" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">What we capture</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            We capture frames (images) from your webcam at a low rate (1–2 per second), not continuous video.
            These frames are used only for real-time emotion and engagement analysis. No video recording is stored.
          </p>
        </section>

        <section id="storage" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">What we store</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            We do <strong className="text-white/90">not</strong> store raw video or images. We store only metadata:
            aggregated emotion metrics, engagement scores, and timestamps for analytics and reports. Data is anonymized
            in group-level views.
          </p>
        </section>

        <section id="access" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">Who can access</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Access is role-based. Students see only their own summary (if they opt in). Teachers see aggregated
            analytics for their groups and sessions. Administrators manage users and system settings. We do not share
            data with third parties for marketing or non-educational purposes.
          </p>
        </section>

        <section id="retention" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">Retention</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Retention policy is configurable by your institution. You can request deletion of your data; we will
            process it in line with applicable regulations (e.g. GDPR).
          </p>
        </section>

        <section id="consent" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">Your consent</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Participation in video-based analytics requires your explicit consent. You can give or withdraw consent
            at any time in the Consent Center. Without consent, no frames are captured or analyzed.
          </p>
          <Link
            href="/consent"
            className="inline-block mt-2 rounded-2xl bg-purple-500/20 border border-purple-400/30 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-purple-500/30 transition"
          >
            Consent Center →
          </Link>
        </section>
      </Card>
    </div>
  );
}
