import type { Variants, Transition } from "framer-motion";

// Sidebar animation variants
export const sidebarVariants: Variants = {
  expanded: {
    width: 280,
    transition: {
      duration: 0.1,
      ease: "easeInOut",
    },
  },
  collapsed: {
    width: 64,
    transition: {
      duration: 0.1,
      ease: "easeInOut",
    },
  },
};

export const sidebarContentVariants: Variants = {
  expanded: {
    opacity: 1,
    display: "block",
    transition: {
      delay: 0.1,
      duration: 0.2,
    },
  },
  collapsed: {
    opacity: 0,
    transitionEnd: {
      display: "none",
    },
    transition: {
      duration: 0.1,
    },
  },
};

// Message animation variants
export const messageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Welcome view animation
export const welcomeVariants: Variants = {
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  hidden: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};

// Chat input position animation (spring for natural feel)
export const chatInputTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
};

// Chat container layout variants
export const chatContainerVariants: Variants = {
  initial: {
    justifyContent: "center",
  },
  active: {
    justifyContent: "flex-end",
  },
};
