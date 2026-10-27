import { Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, TOOLTIP_PROPS } from './chartTheme'

// A line chart of activity over time, with a draggable Brush underneath
// so the viewer can zoom into a range by dragging its handles — the
// closest thing to Desmos-style pan/zoom this app has.
function LineStat({ points, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={24}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP_PROPS} formatter={(value) => [value, 'events']} />
        <Line
          type="monotone"
          dataKey="count"
          stroke={CHART_COLORS.gold}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: CHART_COLORS.accent }}
          animationDuration={500}
        />
        {points.length > 10 && (
          <Brush
            dataKey="label"
            height={22}
            stroke={CHART_COLORS.gold}
            fill="rgba(240, 162, 76, 0.08)"
            travellerWidth={8}
            tickFormatter={() => ''}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

export default LineStat
