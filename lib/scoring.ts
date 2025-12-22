// src/lib/scoring.ts

// src/lib/scoring.ts

export function calculatePointsForBpm(
  bpm: number,
  z1: number,
  z2: number,
  z3: number
): number {
  if (bpm >= z3) {
    return 3;
  } else if (bpm >= z2) {
    return 2;
  } else if (bpm >= z1) {
    return 1;
  } else {
    return 0; // BPM below z1 get 0 points
  }
}
