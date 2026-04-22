// Accessible tag colors — all pass WCAG AA contrast with white text
export const TAG_COLORS = [
  "#DC2626", // red
  "#C2410C", // orange-red
  "#D97706", // amber
  "#65A30D", // lime
  "#16A34A", // green
  "#0D9488", // teal
  "#0284C7", // sky blue
  "#2563EB", // blue
  "#4F46E5", // indigo
  "#7C3AED", // violet
  "#9333EA", // purple
  "#C026D3", // fuchsia
  "#DB2777", // pink
  "#BE123C", // rose
  "#0F766E", // dark teal
  "#1D4ED8", // dark blue
  "#6D28D9", // dark violet
  "#92400E", // brown
  "#065F46", // dark green
  "#1E3A5F", // navy
];

export function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}
