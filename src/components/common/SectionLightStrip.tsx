import { cn } from "@/lib/cn";

/**
 * Полноширинная «светлая» полоса для чередования с тёмными блоками.
 * В светлой теме = фон страницы; в тёмной = заметно светлее (--strip-light).
 */
type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function SectionLightStrip({ className, children }: Props) {
  return (
    <div className={cn("w-full bg-strip-light", className)}>
      {children}
    </div>
  );
}
