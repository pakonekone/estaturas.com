/**
 * Convert cm to feet/inches string. Handles the 12" → next foot rollover.
 */
export function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  let ft = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches % 12);
  if (inches === 12) {
    ft += 1;
    inches = 0;
  }
  return `${ft}'${inches}"`;
}

/** Height constants */
export const PROMEDIO_H = 176; // Spanish male average
export const PROMEDIO_M = 163; // Spanish female average
export const MIN_HUMAN_H = 55;
export const MAX_HUMAN_H = 272;
