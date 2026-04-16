import Link from "next/link";
import PageTitle from "@/components/common/PageTitle";
import {Card} from "@/components/ui/Card";

const SECTIONS = [
  { id: "purpose", label: "Purpose" },
  { id: "limits", label: "What we don't do" },
  { id: "model", label: "About the model" },
] as const;

export default function Ethics() {
  return (
    <div className="space-y-8">
      <PageTitle
        overline="Public"
        title="Ethics & Responsible AI"
        subtitle="This system is not for grading or punishment."
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
        <section id="purpose" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">Purpose</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            ELAS is designed to support teaching and learning. We provide aggregated analytics on engagement and
            emotional signals so that educators can improve lectures and better support students. Results are
            <strong className="text-white/90"> not</strong> used for automatic grading, ranking, or formal assessment.
          </p>
        </section>

        <section id="limits" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">What we do not do</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
            <li>Not used for grades, penalties, or disciplinary actions.</li>
            <li>Not used to judge or label individuals.</li>
            <li>Only aggregated, anonymized analytics for improving teaching and session quality.</li>
          </ul>
        </section>

        <section id="model" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-2">About the model</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Emotion and engagement models can be wrong. Treat results as supportive signals, not ground truth.
            We log model performance and allow configuration so institutions can align the system with their
            ethical guidelines.
          </p>
          <Link
            href="/privacy#consent"
            className="inline-block mt-2 text-sm text-purple-300 hover:text-purple-200 transition"
          >
            Privacy & consent →
          </Link>
        </section>
      </Card>
    </div>
  );
}
