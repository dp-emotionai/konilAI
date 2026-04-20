import type { Participant } from "@/lib/types";

export const mockParticipants: Participant[] = [
  { id: "p1", fullName: "Student #12", emotion: "Focused", stress: 0.33, engagement: 0.78, quality: "good" },
  { id: "p2", fullName: "Student #07", emotion: "Neutral", stress: 0.41, engagement: 0.62, quality: "good" },
  { id: "p3", fullName: "Student #19", emotion: "Anxious", stress: 0.71, engagement: 0.55, quality: "medium" },
  { id: "p4", fullName: "Student #03", emotion: "Bored", stress: 0.29, engagement: 0.32, quality: "poor" },
  { id: "p5", fullName: "Student #25", emotion: "Neutral", stress: 0.52, engagement: 0.48, quality: "medium" },
];
