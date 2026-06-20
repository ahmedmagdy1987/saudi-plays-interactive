/// <reference types="vite/client" />

// Progressive-enhancement fail-safe hooks defined by the early guard in index.html.
declare global {
  interface Window {
    /** Force every motion-hidden element visible (called on error / watchdog). */
    __spRevealAll?: () => void;
    /** Arm the blank-page watchdog (called once at app start). */
    __spArm?: () => void;
    /** Confirm a live motion frame -> cancels the watchdog. */
    __spMotionOK?: () => void;
  }
}

export {};
