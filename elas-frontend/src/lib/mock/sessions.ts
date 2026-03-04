export type SessionType = "lecture" | "exam";
export type SessionStatus = "draft" | "active" | "finished";

export type Session = {
  id: string;
  code: string;
  type: SessionType;
  title: string;
  group: string;
  teacher: string;
  date: string; // ISO
  participants: number;
  status: SessionStatus;
  quality: "good" | "medium" | "poor";
};

export const mockSessions: Session[] = [
  {
    id: "s1",
    code: "ELAS-9K2A",
    type: "lecture",
    title: "Web Programming — React Intro",
    group: "DE-21",
    teacher: "teacher@elas.kz",
    date: "2026-02-10T10:00:00Z",
    participants: 18,
    status: "finished",
    quality: "good",
  },
  {
    id: "s2",
    code: "ELAS-5M1Q",
    type: "exam",
    title: "Midterm Exam — Databases",
    group: "DE-21",
    teacher: "teacher@elas.kz",
    date: "2026-02-15T09:00:00Z",
    participants: 22,
    status: "active",
    quality: "medium",
  },
  {
    id: "s3",
    code: "ELAS-1X7P",
    type: "lecture",
    title: "Algorithms — Complexity",
    group: "DE-22",
    teacher: "teacher@elas.kz",
    date: "2026-02-18T12:30:00Z",
    participants: 16,
    status: "draft",
    quality: "poor",
  },
];
