import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, TOOLTIP_PROPS } from './chartTheme'

const HOUR_TICKS = [0, 6, 12, 18, 24]

function formatHour(hour) {
  const h = Math.round(hour) % 24
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

// A scatter plot of individual events by date (x) and hour of day (y) —
// one dot per event (or per sample, for large datasets) — showing the
// raw pattern that the hourly histogram only summarizes.
function ScatterStat({ points, height = 220 }) {
  const timestamps = points.map((p) => p.timestamp)
  const minX = Math.min(...timestamps)
  const maxX = Math.max(...timestamps)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={[minX, maxX]}
          tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          dataKey="hour"
          type="number"
          domain={[0, 24]}
          ticks={HOUR_TICKS}
          tickFormatter={formatHour}
          tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={(value, name) => (name === 'hour' ? [formatHour(value), 'time'] : [value, name])}
          labelFormatter={() => ''}
        />
        <Scatter data={points} fill={CHART_COLORS.accent} fillOpacity={0.55} animationDuration={400} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default ScatterStat
