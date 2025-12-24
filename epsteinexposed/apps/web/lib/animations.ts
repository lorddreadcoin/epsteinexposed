export const spring = {
  gentle: { type: "spring", stiffness: 120, damping: 14 },
  snappy: { type: "spring", stiffness: 300, damping: 20 },
  bouncy: { type: "spring", stiffness: 400, damping: 10 },
  smooth: { type: "spring", stiffness: 100, damping: 20 },
};

export const transition = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  medium: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
};

export const stagger = {
  fast: { staggerChildren: 0.03 },
  medium: { staggerChildren: 0.05 },
  slow: { staggerChildren: 0.1 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const pulseGlow = {
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(0, 212, 255, 0)",
      "0 0 0 8px rgba(0, 212, 255, 0.3)",
      "0 0 0 0 rgba(0, 212, 255, 0)",
    ],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};
