import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  text: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

export default function EmptyState({ title, text, action, className, icon }: EmptyStateProps) {
  return (
    <Card variant="subtle" className={cn("p-6 md:p-8 text-center", className)}>
      {icon && <div className="flex justify-center mb-4 text-muted">{icon}</div>}
      <h3 className="text-lg font-semibold text-fg">{title}</h3>
      <p className="mt-2 text-sm text-muted max-w-sm mx-auto leading-relaxed">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}
