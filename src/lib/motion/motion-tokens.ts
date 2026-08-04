export const motionDuration = {
  instant: 0.1,
  fast: 0.16,
  normal: 0.22,
  slow: 0.32,
  deliberate: 0.45,
} as const;

export const motionEase = {
  enter: [0.22, 1, 0.36, 1],
  exit: [0.4, 0, 1, 1],
  standard: [0.4, 0, 0.2, 1],
} as const;
