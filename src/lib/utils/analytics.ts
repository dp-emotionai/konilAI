export function timelineToCharts() {
  return {
    labels: [] as string[],
    engagement: [] as number[],
    stress: [] as number[],
    confidence: [] as number[],
  };
}

export function generateInsights() {
  return [] as { id: string; title: string; text: string }[];
}
