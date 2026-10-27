import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, TOOLTIP_PROPS } from './chartTheme'

// A 24-bar histogram of activity by hour of day. Expects
// [{ hour, label, count }] for all 24 hours (see hourlyHistogram()).
function HistogramStat({ items, height = 180 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={items} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={20}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP_PROPS} formatter={(value) => [value, 'events']} />
        <Bar dataKey="count" fill={CHART_COLORS.accent} radius={[3, 3, 0, 0]} animationDuration={400} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default HistogramStat
