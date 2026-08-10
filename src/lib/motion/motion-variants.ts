import type { Variants } from "framer-motion";
import { motionDuration, motionEase } from "@/lib/motion/motion-tokens";

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: motionDuration.normal, ease: motionEase.enter } },
  exit: { opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: motionDuration.normal, ease: motionEase.enter } },
  exit: { opacity: 0, y: 4, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: motionDuration.normal, ease: motionEase.enter } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const slideFromRight: Variants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: motionDuration.normal, ease: motionEase.enter } },
  exit: { opacity: 0, x: 8, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const slideFromBottom: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: motionDuration.normal, ease: motionEase.enter } },
  exit: { opacity: 0, y: 8, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: motionDuration.fast, ease: motionEase.standard } },
  exit: { opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
};

export const modalPanel = fadeScale;
export const drawerPanel = slideFromRight;
export const messageIncoming = fadeUp;
export const messageOutgoing = fadeUp;
export const typingIndicator = fadeIn;
export const statusTransition = fadeIn;
export const progressTransition = fadeIn;
export const runtimeStepEnter = fadeUp;
export const runtimeStepExit = fadeIn;
export const pathHighlight = fadeIn;
export const safetyNoticeEnter = fadeScale;
export const escalationPanelEnter = slideFromRight;
export const logItemEnter = fadeUp;
export const highlightPulse = {
  initial: { opacity: 0.82, scale: 1 },
  animate: {
    opacity: [0.82, 1, 0.82],
    scale: [1, 1.01, 1],
    transition: { duration: motionDuration.deliberate, repeat: Infinity, ease: motionEase.standard },
  },
};

// One-shot "worksheet field just got filled" flourish -- see useJustFilled
// in worksheet-renderers/shared.tsx. Unlike highlightPulse (infinite, marks
// the currently-active field), this plays exactly once on the false->true
// transition and settles back to rest; its total duration should match the
// timeout useJustFilled uses to clear the "just filled" flag.
export const questComplete: Variants = {
  initial: { opacity: 0, scale: 0.5, y: 6 },
  animate: {
    opacity: [0, 1, 1, 0],
    scale: [0.5, 1.15, 1, 1],
    y: 0,
    transition: { duration: 1.3, times: [0, 0.25, 0.75, 1], ease: motionEase.standard },
  },
};
