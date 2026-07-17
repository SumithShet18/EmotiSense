export const EMOTION_CODES = ["ang", "hap", "sad", "neu", "fru"] as const;
export const EMOTION_LABELS_MAP: Record<string, string> = {
  ang: "Angry", hap: "Happy", sad: "Sad", neu: "Neutral", fru: "Frustrated",
};
export const MODEL_CONFIGS = [
  "Text-Only",
  "Audio-Only",
  "Fusion (Both)",
  "Fine-Tuned Model",
] as const;

export const overallPerformance = [
  { config: "Text-Only",      accuracy: 56.54, macroF1: 54.65 },
  { config: "Audio-Only",     accuracy: 50.37, macroF1: 51.53 },
  { config: "Fusion (Both)",  accuracy: 61.78, macroF1: 58.22 },
  { config: "Fine-Tuned Model", accuracy: 65.17, macroF1: 64.90 },
];

export const f1ByClass = [
  { emotion: "ang", "Text-Only": 0.53, "Audio-Only": 0.42, "Fusion (Both)": 0.50, "Fine-Tuned Model": 0.61 },
  { emotion: "hap", "Text-Only": 0.68, "Audio-Only": 0.48, "Fusion (Both)": 0.71, "Fine-Tuned Model": 0.73 },
  { emotion: "sad", "Text-Only": 0.54, "Audio-Only": 0.54, "Fusion (Both)": 0.54, "Fine-Tuned Model": 0.68 },
  { emotion: "neu", "Text-Only": 0.51, "Audio-Only": 0.58, "Fusion (Both)": 0.62, "Fine-Tuned Model": 0.64 },
  { emotion: "fru", "Text-Only": 0.54, "Audio-Only": 0.43, "Fusion (Both)": 0.52, "Fine-Tuned Model": 0.59 },
];

export const confusionMatrices: Record<string, number[][]> = {
  "Text-Only": [
    [55.3, 5.3, 5.9, 5.9, 27.6],
    [4.3, 60.9, 11.8, 16.1, 7.0],
    [1.6, 2.9, 58.8, 16.7, 20.0],
    [4.4, 11.2, 13.0, 50.5, 20.8],
    [13.9, 4.5, 8.4, 16.5, 56.7],
  ],
  "Audio-Only": [
    [40.6, 10.0, 0.0, 13.5, 35.9],
    [6.1, 37.8, 5.9, 32.6, 17.6],
    [1.2, 9.0, 46.9, 26.9, 15.9],
    [1.6, 6.5, 5.5, 79.4, 7.0],
    [13.6, 5.5, 4.7, 33.9, 42.3],
  ],
  "Fusion (Both)": [
    [61.8, 7.6, 1.8, 8.8, 20.0],
    [6.1, 69.9, 3.2, 15.8, 5.0],
    [1.6, 9.4, 62.0, 13.1, 13.9],
    [4.7, 15.6, 4.7, 67.7, 7.3],
    [24.4, 6.3, 3.1, 19.9, 46.2],
  ],
  "Fine-Tuned Model": [
    [62.9, 2.9, 4.1, 8.8, 21.2],
    [3.2, 62.7, 5.7, 21.3, 7.2],
    [0.4, 1.6, 66.5, 18.4, 13.1],
    [2.6, 4.7, 5.7, 75.8, 11.2],
    [13.1, 3.9, 5.0, 20.5, 57.5],
  ],
};
