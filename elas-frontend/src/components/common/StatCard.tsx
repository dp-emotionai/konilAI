import Card from "@/components/ui/Card";

export default function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-6">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-2 text-sm text-white/50">{hint}</div>}
    </Card>
  );
}
