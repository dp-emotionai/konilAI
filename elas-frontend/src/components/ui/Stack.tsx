import { cn } from "@/lib/cn";

export function Stack({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-10 md:space-y-12", className)}>{children}</div>;
}