export const DEFAULT_CATEGORY_COLOR = "#94a3b8"

export const CATEGORY_COLOR_PALETTE = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#4ade80",
  "#2dd4bf",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#e879f9",
  "#f472b6",
] as const

export function getCategoryColor(category: { color: string | null } | null): string {
  return category?.color || DEFAULT_CATEGORY_COLOR
}

export function getChartPalette(): string[] {
  return CATEGORY_COLOR_PALETTE.slice()
}