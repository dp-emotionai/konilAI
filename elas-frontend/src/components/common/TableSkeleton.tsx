import Skeleton from "@/components/ui/Skeleton";

export default function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-black/20">
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 items-center">
            <Skeleton className="h-4 col-span-5" />
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
