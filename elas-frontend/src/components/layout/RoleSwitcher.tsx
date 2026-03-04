"use client";

import { useUI } from "./Providers";
import type { Role } from "@/lib/roles";
import Badge from "@/components/ui/Badge";

const roles: Role[] = ["student", "teacher", "admin"];

export default function RoleSwitcher() {
  const { state, setRole } = useUI();

  return (
    <div className="flex items-center gap-2">
      <Badge>DEMO</Badge>
      <select
        value={state.role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="h-9 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-white/80 outline-none"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {r.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
