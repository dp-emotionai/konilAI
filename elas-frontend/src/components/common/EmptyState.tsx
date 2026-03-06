import { Card, CardContent } from "@/components/ui/Card";

export default function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-6">
      <div className="font-semibold">{title}</div>
      <div className="text-white/60 mt-2">{text}</div>
    </Card>
  );
}
