export type Role = "student" | "teacher" | "admin";

export type SessionType = "lecture" | "exam";
export type SessionStatus = "draft" | "active" | "finished";
export type Quality = "good" | "medium" | "poor";

export type Session = {
  id: string;
  title: string;
  type: SessionType;
  group: string;
  teacher: string;
  date: string; // ISO
  status: SessionStatus;
  quality: Quality;
};

export type User = {
  id: string;
  email: string;
  role: Role;
  status: "active" | "blocked";
  createdAt: string; // ISO
};

export type Participant = {
  id: string;
  fullName: string;
  emotion: "Neutral" | "Focused" | "Bored" | "Anxious" | "Happy" | "Sad";
  stress: number;      // 0..1
  engagement: number;  // 0..1
  quality: Quality;
};
