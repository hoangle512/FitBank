// src/lib/scoring.ts

export const DEFAULT_AGE = 30;

export function calculateMaxHeartRate(age: number = DEFAULT_AGE): number {
  return 220 - age;
}

export enum HeartRateZone {
  Zone1 = 'Below Zone 2',
  Zone2 = 'Zone 2 (Light)',
  Zone3 = 'Zone 3 (Moderate)',
  Zone4 = 'Zone 4 (Hard)',
  Zone5 = 'Zone 5 (Maximum)',
}

export function getHeartRateZone(
  bpm: number,
  age: number = DEFAULT_AGE
): HeartRateZone {
  const maxHr = calculateMaxHeartRate(age);
  const percentage = (bpm / maxHr) * 100;

  if (percentage < 60) return HeartRateZone.Zone1;
  if (percentage >= 60 && percentage < 70) return HeartRateZone.Zone2;
  if (percentage >= 70 && percentage < 80) return HeartRateZone.Zone3;
  if (percentage >= 80 && percentage < 90) return HeartRateZone.Zone4;
  return HeartRateZone.Zone5;
}

export function calculatePointsForBpm(
  bpm: number,
  age: number = DEFAULT_AGE
): number {
  const zone = getHeartRateZone(bpm, age);

  switch (zone) {
    case HeartRateZone.Zone2:
      return 1;
    case HeartRateZone.Zone3:
      return 2;
    case HeartRateZone.Zone4:
    case HeartRateZone.Zone5:
      return 3;
    default:
      return 0;
  }
}
