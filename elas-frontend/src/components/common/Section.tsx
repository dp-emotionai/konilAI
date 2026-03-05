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
      ? "py-6 md:py-8"
      : spacing === "loose"
      ? "py-14 md:py-20"
      : "py-10 md:py-14";

  return (
    <section className={cn("mx-auto max-w-elas-page px-4", pad, className)}>
      {children}
    </section>
  );
}