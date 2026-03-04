export type ReportItem = {
  id: string;
  sessionId: string;
  title: string;
  type: "lecture" | "exam" | "compare";
  format: "PDF" | "CSV";
  createdAt: string;
};

export const mockReports: ReportItem[] = [
  { id: "r1", sessionId: "s1", title: "React Intro — Report", type: "lecture", format: "PDF", createdAt: "2026-02-10" },
  { id: "r2", sessionId: "s2", title: "Midterm Exam — Report", type: "exam", format: "PDF", createdAt: "2026-02-15" },
  { id: "r3", sessionId: "s1+s2", title: "Compare s1 vs s2", type: "compare", format: "CSV", createdAt: "2026-02-16" },
];
