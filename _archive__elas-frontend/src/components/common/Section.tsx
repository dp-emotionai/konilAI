import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  children: React.ReactNode;
  spacing?: "none" | "tight" | "normal" | "loose";
};

export default function Section({ className, children, spacing = "normal" }: Props) {
  const pad =
    spacing === "none"
      ? ""
      : spacing === "tight"
      ? "py-8 md:py-10"
      : spacing === "loose"
      ? "py-16 md:py-24"
      : "mt-12 mb-12 py-12 md:py-16";

  return (
    <section className={cn("mx-auto max-w-elas-page px-4", pad, className)}>
      {children}
    </section>
  );
}