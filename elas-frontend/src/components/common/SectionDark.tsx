import { cn } from "@/lib/cn";

/**
 * Полноширинная тёмная полоса для чередования со светлыми (SectionLightStrip).
 * Фон #0a0b12 (dark), контент — белый/светлый текст.
 */
type Props = {
  className?: string;
  children: React.ReactNode;
  spacing?: "none" | "tight" | "normal" | "loose";
};

export default function SectionDark({ className, children, spacing = "normal" }: Props) {
  const pad =
    spacing === "none"
      ? ""
      : spacing === "tight"
        ? "py-6 md:py-8"
        : spacing === "loose"
          ? "py-14 md:py-20"
          : "py-10 md:py-14";

  return (
    <section
      className={cn(
        "w-full bg-[#0a0b12] dark:bg-[#060710] text-white",
        pad,
        className
      )}
    >
      <div className="mx-auto max-w-elas-page px-4">
        {children}
      </div>
    </section>
  );
}
