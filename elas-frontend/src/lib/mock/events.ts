export type EmotionEvent = {
  t: number; // minute
  engagement: number; // 0-100
  stress: number; // 0-100
  confidence: number; // 0-100
  emotion: "neutral" | "happy" | "sad" | "angry" | "fear" | "surprise" | "disgust";
};

export const mockTimeline: EmotionEvent[] = Array.from({ length: 45 }).map((_, i) => {
  const engagement = 60 + Math.round(20 * Math.sin(i / 6));
  const stress = 35 + Math.round(25 * Math.cos(i / 7));
  const confidence = 55 + Math.round(18 * Math.sin(i / 8));
  const emotions: EmotionEvent["emotion"][] = ["neutral", "happy", "sad", "angry", "fear", "surprise", "disgust"];
  return { t: i + 1, engagement, stress, confidence, emotion: emotions[i % emotions.length] };
});
