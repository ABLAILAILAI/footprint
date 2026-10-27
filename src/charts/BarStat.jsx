import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, TOOLTIP_PROPS } from './chartTheme'

// A horizontal, hoverable bar chart for ranked categorical counts
// (top channels, interest categories). Expects items already sorted
// the way they should display, as [{ label, count }].
function BarStat({ items, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={items} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_PROPS} formatter={(value) => [value, 'events']} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22} animationDuration={400}>
          {items.map((item, index) => (
            <Cell
              key={item.label}
              fill={index === 0 ? CHART_COLORS.gold : CHART_COLORS.accent}
              fillOpacity={index === 0 ? 1 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default BarStat
