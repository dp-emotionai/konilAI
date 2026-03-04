export type GroupStatus = "active" | "archived";

export type GroupMember = {
  id: string;
  name: string;
  email?: string;
};

export type Group = {
  id: string;
  name: string;          // e.g. "AI-21"
  program: string;       // e.g. "Artificial Intelligence"
  status: GroupStatus;

  teacher: {
    id: string;
    name: string;
    email?: string;
  };

  students: GroupMember[];

  createdAt: string;
};

export const groups: Group[] = [
  {
    id: "G-1001",
    name: "AI-21",
    program: "Artificial Intelligence",
    status: "active",
    teacher: { id: "T-01", name: "Dr. Serik", email: "teacher@demo" },
    students: [
      { id: "S-01", name: "Aruzhan K." },
      { id: "S-02", name: "Dias M." },
      { id: "S-03", name: "Amina S." },
      { id: "S-04", name: "Nursultan A." },
      { id: "S-05", name: "Zarina T." },
    ],
    createdAt: "2026-02-20",
  },
  {
    id: "G-1002",
    name: "CS-22",
    program: "Computer Science",
    status: "active",
    teacher: { id: "T-02", name: "Prof. Aiman", email: "teacher2@demo" },
    students: [
      { id: "S-11", name: "Eldar N." },
      { id: "S-12", name: "Alina B." },
      { id: "S-13", name: "Timur R." },
      { id: "S-14", name: "Dana S." },
    ],
    createdAt: "2026-02-18",
  },
  {
    id: "G-1003",
    name: "DS-20",
    program: "Data Science",
    status: "archived",
    teacher: { id: "T-03", name: "Dr. Dana", email: "teacher3@demo" },
    students: [
      { id: "S-21", name: "Madina A." },
      { id: "S-22", name: "Kairat S." },
      { id: "S-23", name: "Aibek N." },
    ],
    createdAt: "2025-11-10",
  },
];

export function getGroupById(id: string) {
  return groups.find((g) => g.id === id) ?? null;
}