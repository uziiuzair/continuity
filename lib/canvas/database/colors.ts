/**
 * Database Color System
 *
 * Maps database colors to CSS variables from globals.css
 */

import { DatabaseColor } from "@/types/database";

// ============================================
// COLOR DEFINITIONS
// ============================================

export interface ColorConfig {
  bg: string;
  bgHover: string;
  text: string;
  border: string;
}

export const DATABASE_COLORS: Record<DatabaseColor, ColorConfig> = {
  gray: {
    bg: "var(--bn-colors-highlights-gray-background)",
    bgHover: "#d8d9da",
    text: "var(--bn-colors-highlights-gray-text)",
    border: "var(--bn-colors-highlights-gray-text)",
  },
  red: {
    bg: "var(--color-radical-red-50)",
    bgHover: "var(--color-radical-red-100)",
    text: "var(--color-radical-red-600)",
    border: "var(--color-radical-red-300)",
  },
  orange: {
    bg: "var(--color-coral-50)",
    bgHover: "var(--color-coral-100)",
    text: "var(--color-coral-600)",
    border: "var(--color-coral-300)",
  },
  yellow: {
    bg: "var(--color-selective-yellow-50)",
    bgHover: "var(--color-selective-yellow-100)",
    text: "var(--color-selective-yellow-700)",
    border: "var(--color-selective-yellow-300)",
  },
  green: {
    bg: "var(--color-caribbean-green-50)",
    bgHover: "var(--color-caribbean-green-100)",
    text: "var(--color-caribbean-green-600)",
    border: "var(--color-caribbean-green-300)",
  },
  blue: {
    bg: "var(--color-bright-turquoise-50)",
    bgHover: "var(--color-bright-turquoise-100)",
    text: "var(--color-bright-turquoise-600)",
    border: "var(--color-bright-turquoise-300)",
  },
  purple: {
    bg: "var(--color-lavender-50)",
    bgHover: "var(--color-lavender-100)",
    text: "var(--color-lavender-600)",
    border: "var(--color-lavender-300)",
  },
  pink: {
    bg: "var(--color-lavender-rose-50)",
    bgHover: "var(--color-lavender-rose-100)",
    text: "var(--color-lavender-rose-600)",
    border: "var(--color-lavender-rose-300)",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getColorStyles(color: DatabaseColor | undefined): React.CSSProperties {
  if (!color) return {};

  const config = DATABASE_COLORS[color];
  return {
    backgroundColor: config.bg,
    color: config.text,
  };
}

export function getSelectTagStyles(color: DatabaseColor): React.CSSProperties {
  const config = DATABASE_COLORS[color];
  return {
    backgroundColor: config.bg,
    color: config.text,
    borderColor: config.border,
  };
}

export function getKanbanColumnStyles(color: DatabaseColor): React.CSSProperties {
  const config = DATABASE_COLORS[color];
  return {
    backgroundColor: config.bg,
    borderColor: config.border,
  };
}

// ============================================
// COLOR LIST FOR PICKERS
// ============================================

export const ALL_COLORS: DatabaseColor[] = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
];

export const COLOR_NAMES: Record<DatabaseColor, string> = {
  gray: "Gray",
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
};

/**
 * Get color classes for a database color
 */
export function getColorClasses(color: DatabaseColor): ColorConfig {
  return DATABASE_COLORS[color] || DATABASE_COLORS.gray;
}
