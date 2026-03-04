import { mockTimeline } from "@/lib/mock/events";

export function timelineToCharts() {
  const labels = mockTimeline.map((x) => `${x.t}m`);
  return {
    labels,
    engagement: mockTimeline.map((x) => x.engagement),
    stress: mockTimeline.map((x) => x.stress),
    confidence: mockTimeline.map((x) => x.confidence),
  };
}

export function generateInsights() {
  // very simple mock insights
  return [
    { id: "i1", title: "Engagement drop detected", text: "Between 18–24 min engagement decreased by ~12%." },
    { id: "i2", title: "Stress peaks", text: "Stress peaks around 10–12 min and 33–35 min." },
    { id: "i3", title: "Stable confidence", text: "Confidence remains stable across the last 15 minutes." },
  ];
}
