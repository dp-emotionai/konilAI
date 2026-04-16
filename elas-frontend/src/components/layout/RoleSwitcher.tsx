"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/roles";
import { useUI } from "@/components/layout/Providers";
import Badge from "@/components/ui/Badge";

export default function RoleSwitcher() {
  const { state, setRole } = useUI();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge>DEMO</Badge>

      <select
        value={state.role ?? "student"}
        onChange={(e) => setRole(e.target.value as Role)}
        className="h-9 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none"
      >
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>
    </div>
  );
}