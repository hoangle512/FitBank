// src/lib/scoring.ts

// src/lib/scoring.ts

export function calculatePointsForBpm(bpm: number): number {
  if (bpm >= 125 && bpm <= 149) {
    return 1;
  } else if (bpm >= 150 && bpm <= 164) {
    return 2;
  } else if (bpm >= 165) {
    return 3;
  } else {
    return 0; // BPM below 125 get 0 points
  }
}

