import { cn } from "@/lib/cn";

export default function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl px-4",
        "bg-black/30 border border-white/10 text-white placeholder:text-white/40",
        "focus:outline-none focus:ring-2 focus:ring-purple-500/40",
        className
      )}
      {...props}
    />
  );
}
