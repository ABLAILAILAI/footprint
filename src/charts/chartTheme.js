// Mirrors the CSS custom properties in App.css. Recharts needs real
// color values (it can't read CSS variables through getComputedStyle
// without extra plumbing), so these are kept in sync by hand.
export const CHART_COLORS = {
  gold: '#c9a227',
  accent: '#f0a24c',
  text: '#ffffff',
  textSecondary: '#adadad',
  muted: '#7d7d7d',
  grid: '#2a2219',
  tooltipBg: '#1d1510',
}

// Shared Recharts <Tooltip> props so every chart's hover popup looks
// the same (dark card, gold border, matching the app's theme).
export const TOOLTIP_PROPS = {
  cursor: { fill: 'rgba(240, 162, 76, 0.08)' },
  contentStyle: {
    background: CHART_COLORS.tooltipBg,
    border: `1px solid rgba(240, 162, 76, 0.4)`,
    borderRadius: '0.5rem',
    color: CHART_COLORS.text,
    fontSize: '0.85rem',
  },
  labelStyle: { color: CHART_COLORS.text, fontWeight: 600 },
  itemStyle: { color: CHART_COLORS.textSecondary },
}
