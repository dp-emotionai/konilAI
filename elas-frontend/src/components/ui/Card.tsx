import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export function Card({ className, children }: Props) {
  return (
    <div
      className={cn(
        "rounded-elas-lg bg-surface shadow-card",
        "dark:shadow-soft-dark",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: Props) {
  return <div className={cn("px-6 pt-6", className)}>{children}</div>;
}

export function CardContent({ className, children }: Props) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}