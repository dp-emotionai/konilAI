import type { Role } from "@/lib/roles";

export type User = {
  id: string;
  email: string;
  role: Role;
  status: "active" | "blocked";
  createdAt: string;
};

export const mockUsers: User[] = [
  { id: "u1", email: "student1@elas.kz", role: "student", status: "active", createdAt: "2026-01-10" },
  { id: "u2", email: "student2@elas.kz", role: "student", status: "active", createdAt: "2026-01-12" },
  { id: "u3", email: "teacher@elas.kz", role: "teacher", status: "active", createdAt: "2026-01-08" },
  { id: "u4", email: "admin@elas.kz", role: "admin", status: "active", createdAt: "2026-01-01" },
];
