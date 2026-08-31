'use client'

import { useMemo, useRef, useState } from 'react'
import { ROLLING_AVERAGE_WINDOW, rollingAverageAccuracy } from '@/lib/accuracyTrend'
import { formatDate } from '@/lib/dates'
import { getStrings } from '@/lib/i18n/strings'
import type { AccuracyTrendPoint } from '@/lib/types'

const WIDTH = 640
const HEIGHT = 200
const PAD_LEFT = 32
const PAD_RIGHT = 8
const PAD_TOP = 10
// Extra room below the plot for the x-axis reference labels — see
// X_TICK_COUNT below.
const PAD_BOTTOM = 26
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM
const GRID_VALUES = [0, 50, 100]
const BASELINE_Y = HEIGHT - PAD_BOTTOM

// The x-axis is game index, not a continuous date scale (see the module
// comment below), so it gets no per-point labels — just a handful of
// reference points so the reader can tell roughly where in time they're
// looking, not every date.
const X_TICK_COUNT = 4

function xFor(index: number, count: number): number {
  if (count <= 1) return PAD_LEFT + PLOT_WIDTH / 2
  return PAD_LEFT + (index / (count - 1)) * PLOT_WIDTH
}

function yFor(accuracy: number): number {
  return PAD_TOP + (1 - accuracy / 100) * PLOT_HEIGHT
}

/** `X_TICK_COUNT` evenly spaced point indices, always including the first
 *  and last — deduped (a short series can't actually space out that many
 *  distinct ticks) and sorted ascending. */
function xTickIndices(count: number): number[] {
  if (count <= X_TICK_COUNT) return Array.from({ length: count }, (_, i) => i)
  const indices = new Set<number>()
  for (let i = 0; i < X_TICK_COUNT; i++) {
    indices.add(Math.round((i * (count - 1)) / (X_TICK_COUNT - 1)))
  }
  return [...indices].sort((a, b) => a - b)
}

/**
 * Hand-rolled SVG line chart — no charting library for one line. Two marks,
 * one series: muted per-game dots as context (toggleable off), a single
 * accent-colored rolling-average line as the point (the "emphasis" form —
 * see the dataviz skill's choosing-a-form guide), so it needs no legend.
 *
 * The x-axis is game index, not calendar date, deliberately — real play
 * sessions are bursty (a dozen bot games in one sitting), so spacing by date
 * would pile points on top of each other on a busy day and waste width on
 * the gaps between sessions. Spacing by index keeps every game equally
 * legible regardless of when it was played; a handful of x-axis reference
 * dates (xTickIndices) plus each dot's own hover tooltip still ground the
 * reader in real time without spacing by it.
 */
export function AccuracyTrendChart({ points }: { points: AccuracyTrendPoint[] }) {
  const s = getStrings()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [showDots, setShowDots] = useState(true)

  const averages = useMemo(() => rollingAverageAccuracy(points), [points])
  const xTicks = useMemo(() => xTickIndices(points.length), [points.length])

  if (points.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.accuracyTrend.empty}</p>
  }

  const linePath = averages
    .map((avg, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i, points.length)} ${yFor(avg)}`)
    .join(' ')
  const areaPath = `${linePath} L ${xFor(points.length - 1, points.length)} ${BASELINE_Y} L ${xFor(0, points.length)} ${BASELINE_Y} Z`

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || points.length === 0) return
    const rect = svg.getBoundingClientRect()
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const ratio = points.length <= 1 ? 0 : (relativeX - PAD_LEFT) / PLOT_WIDTH
    const index = Math.round(ratio * (points.length - 1))
    setHoverIndex(Math.min(points.length - 1, Math.max(0, index)))
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const hoveredAverage = hoverIndex !== null ? averages[hoverIndex] : null
  // Clamped rather than centered exactly under the edge points — a tooltip
  // centered on the very first/last dot would hang half off the chart.
  // ponytail: a fixed 8/92 clamp, not real collision math against the
  // tooltip's own rendered width — good enough at this chart's fixed size,
  // revisit if the chart ever becomes narrow enough for the tooltip itself
  // to overflow.
  const hoverXPercent =
    hoverIndex !== null
      ? Math.min(92, Math.max(8, (xFor(hoverIndex, points.length) / WIDTH) * 100))
      : 0

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {s.accuracyTrend.title}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {s.accuracyTrend.caption(ROLLING_AVERAGE_WINDOW)}
        </p>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
          <input
            type="checkbox"
            checked={showDots}
            onChange={(e) => setShowDots(e.target.checked)}
            className="accent-accent"
          />
          {s.accuracyTrend.showDots}
        </label>
      </div>

      <div className="relative pt-8">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {GRID_VALUES.map((value) => (
            <g key={value}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(value)}
                y2={yFor(value)}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD_LEFT - 6}
                y={yFor(value)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-zinc-500 text-[7px]"
              >
                {value}
              </text>
            </g>
          ))}

          {xTicks.map((i) => {
            const x = xFor(i, points.length)
            const anchor =
              i === xTicks[0] ? 'start' : i === xTicks[xTicks.length - 1] ? 'end' : 'middle'
            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={BASELINE_Y}
                  y2={BASELINE_Y + 4}
                  className="stroke-zinc-300 dark:stroke-zinc-700"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={x}
                  y={BASELINE_Y + 14}
                  textAnchor={anchor}
                  className="fill-zinc-500 text-[7px]"
                >
                  {/* formatDate() returns "DD/MM/YYYY" — the year is dropped
                   *  here for brevity (only ~4 short labels fit); the full
                   *  date is still in each point's own hover tooltip. */}
                  {formatDate(points[i].endTime).slice(0, 5)}
                </text>
              </g>
            )
          })}

          <path d={areaPath} className="fill-accent/10" />
          <path
            d={linePath}
            fill="none"
            className="stroke-accent"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {showDots &&
            points.map(
              (p, i) =>
                hoverIndex !== i && (
                  <circle
                    key={p.gameId}
                    cx={xFor(i, points.length)}
                    cy={yFor(p.accuracy)}
                    r={2.5}
                    className="fill-zinc-500/70"
                  />
                ),
            )}

          {hoverIndex !== null && (
            <>
              <line
                x1={xFor(hoverIndex, points.length)}
                x2={xFor(hoverIndex, points.length)}
                y1={PAD_TOP}
                y2={BASELINE_Y}
                className="stroke-zinc-400 dark:stroke-zinc-600"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={xFor(hoverIndex, points.length)}
                cy={yFor(points[hoverIndex].accuracy)}
                r={4}
                className="fill-accent stroke-zinc-50 dark:stroke-zinc-950"
                strokeWidth={2}
              />
            </>
          )}
        </svg>

        {hovered && hoveredAverage !== null && (
          <div
            className="pointer-events-none absolute top-0 flex flex-col gap-0.5 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs whitespace-nowrap shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{ left: `${hoverXPercent}%`, transform: 'translateX(-50%)' }}
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {hovered.gameLabel}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">{hovered.accuracy}%</span>
            <span className="text-zinc-500 dark:text-zinc-500">
              {s.accuracyTrend.tooltipAverage(ROLLING_AVERAGE_WINDOW)}: {hoveredAverage}%
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
