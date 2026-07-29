"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { MarketBar } from "@/components/MarketTypes" // ← adjust to your actual path
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpBigIcon, ArrowDownBigIcon } from "@hugeicons/core-free-icons"

export const description = "An interactive area chart"

/**
 * Restyled to match the Apex Monitor identity established in app/page.tsx —
 * a fixed, bespoke palette, intentionally outside the app's accent-theme system:
 *   #0C0B09  void   — background
 *   #C79A4B  brass  — hairlines, labels, neutral/no-data trend
 *   #EDE6D8  bone   — primary text
 *   #8B8478  fog    — secondary text
 *   #6E8F71  moss   — price up
 *   #A85D45  rust   — price down
 *
 * The area/line trend color follows the same up/down convention as the
 * ticker chyron on the landing page, falling back to brass while loading
 * or when there's no directional data yet.
 */

// Rounds via Intl.NumberFormat instead of raw .toFixed(2), which sidesteps
// the classic binary floating-point rounding bug — e.g. 340.005 is stored
// as 340.00499999999999545, so .toFixed(2) truncates it to "340.00"
// instead of the expected "340.01". Used for every dollar/percent figure
// rendered in this card.
function formatDecimal(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const chartConfig = {
  close: {
    label: "price",
  },
  timestamp: {
    label: "time",
  },
} satisfies ChartConfig

// Days subtracted per time-range key
const TIMEFRAME_LABELS: Record<string, string> = {
  "1d":   "1D",
  "5d":   "5D",
  "30d":  "1M",
  "90d":  "3M",
  "180d": "6M",
  "365d": "1Y",
}

interface ChartAreaInteractiveProps {
  symbol: string
  symbolSelector?: React.ReactNode
}

// Helper outside your component
function formatTick(value: string, timeRange: string): string {
  const date = new Date(value)

  switch (timeRange) {
    case "1d":
      return date.toLocaleString("en-US", {
        hour:    "2-digit",
        minute:  "2-digit",
      })
    case "5d":
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour:    "2-digit",
        minute:  "2-digit",
      })
    case "30d":
      return date.toLocaleString("en-US", {
        weekday: "short",
        month:   "short",
        day:     "numeric",
        timeZone: "UTC",
      })
    default: // 3M, 6M, 1Y
      return date.toLocaleDateString("en-US", {
        month: "short",
        day:   "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
  }
}

function useMarketBars(symbol: string, timeRange: string) {
  const [state, setState] = React.useState<{
    data: MarketBar[]
    previousClose: number | null
    loading: boolean
    error: string | null
  }>({ data: [], previousClose: null, loading: true, error: null })

  React.useEffect(() => {
    if (!symbol) return

    const tf = TIMEFRAME_LABELS[timeRange] ?? "3M"

    fetch(`http://localhost:8080/api/streams/${symbol}/historical-bars?tf=${tf}`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
          return res.json() as Promise<{ bars: MarketBar[]; previousClose: number | null }>
        })
        .then(({ bars, previousClose }) =>
            setState({ data: bars, previousClose, loading: false, error: null })
        )
        .catch((err: Error) => setState({ data: [], previousClose: null, loading: false, error: err.message }))
  }, [symbol, timeRange])

  return state
}

// Always fetches the 1D window, independent of whatever range the chart
// itself is showing. Since the backend's intraday filter
// (isMarketHours in MarketDataService) strips pre/post-market prints,
// the last bar here is guaranteed to be either the live regular-session
// price (market open) or the most recent 4:00pm close (market closed) —
// never an after-hours print. This is what the header price should track,
// not whatever the currently-toggled range's last bar happens to be.
function useLatestQuote(symbol: string) {
  const [quote, setQuote] = React.useState<{ price: number | null; time: string | null }>({
    price: null,
    time: null,
  })

  React.useEffect(() => {
    if (!symbol) return

    fetch(`http://localhost:8080/api/streams/${symbol}/historical-bars?tf=1D`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
          return res.json() as Promise<{ bars: MarketBar[] }>
        })
        .then(({ bars }) => {
          const last = bars[bars.length - 1]
          setQuote({ price: last?.close ?? null, time: last?.timestamp ?? null })
        })
        .catch(() => setQuote({ price: null, time: null }))
  }, [symbol])

  return quote
}

export function ChartAreaInteractive({ symbol, symbolSelector }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState(() => isMobile ? "5d" : "90d")

  const { data, previousClose, loading, error } = useMarketBars(symbol, timeRange)
  const { price: headerPrice } = useLatestQuote(symbol)

  // Chart-specific "latest point" — must come from the currently-selected
  // range's own data, since it's used to place the ReferenceDot on the
  // chart's x-axis. Using the 1D quote's timestamp here would place the
  // dot at an x-value that doesn't exist in a 90-day/1-year series.
  const chartLatestBar = data[data.length - 1]
  const chartLatestTime = chartLatestBar?.timestamp

  const firstBar = data[0]
  // For 1D/5D, previousClose comes from the backend anchor (the true prior
  // close) rather than the window's first intraday print, which fixed the
  // change-since-open vs change-since-close bug. Daily timeframes fall
  // back to the old behavior since previousClose is null there.
  const firstClose = previousClose ?? firstBar?.close

  // Price change is now anchored to the live/market-hours header price
  // rather than the selected range's last bar. This matters most for
  // daily ranges (30d/90d/etc.), where the range's own "last bar" only
  // reflects a completed daily close and won't include today's
  // still-in-progress intraday movement the way headerPrice does.
  const priceChange =
      headerPrice != null && firstClose != null ? headerPrice - firstClose : null
  const percentChange =
      priceChange != null && firstClose ? (priceChange / firstClose) * 100 : null
  const isPositive = priceChange != null && priceChange >= 0

  // Trend color follows the same up/moss, down/rust convention as the
  // landing page ticker; brass while there's no directional data yet.
  const trendColor = priceChange == null ? "#C79A4B" : isPositive ? "#6E8F71" : "#A85D45"

  return (
      <Card className="@container/card rounded-sm border-[#C79A4B]/15 bg-[#0C0B09] text-[#EDE6D8] shadow-none">
        <CardHeader>
          {symbolSelector && (
              <div className="mb-2 w-full max-w-sm">
                {symbolSelector}
              </div>
          )}
          <CardTitle className="font-mono text-lg font-bold tracking-tight text-[#EDE6D8]">
            {symbol}{" "}
            {headerPrice != null && (
                <span className="font-normal text-[#8B8478]">
              ${formatDecimal(headerPrice)} USD
            </span>
            )}
          </CardTitle>
          <CardDescription>
            {priceChange != null && percentChange != null ? (
                <span
                    className={`inline-flex items-center gap-1 font-mono text-sm ${
                        isPositive ? "text-[#6E8F71]" : "text-[#A85D45]"
                    }`}
                >
      <HugeiconsIcon
          icon={isPositive ? ArrowUpBigIcon : ArrowDownBigIcon}
          strokeWidth={2}
          className="size-3.5"
      />
                  {formatDecimal(Math.abs(percentChange))}% ({isPositive ? "+" : "-"}
                  {formatDecimal(Math.abs(priceChange))})
    </span>
            ) : (
                <span className="text-[#8B8478]">—</span>
            )}
          </CardDescription>
          <CardAction>
            <ToggleGroup
                multiple={false}
                value={timeRange ? [timeRange] : []}
                onValueChange={(value) => setTimeRange(value[0] ?? "90d")}
                variant="outline"
                className="hidden gap-0 rounded-sm border border-[#C79A4B]/20 *:data-[slot=toggle-group-item]:rounded-none *:data-[slot=toggle-group-item]:border-[#C79A4B]/20 *:data-[slot=toggle-group-item]:px-4! *:data-[slot=toggle-group-item]:font-mono *:data-[slot=toggle-group-item]:text-xs *:data-[slot=toggle-group-item]:uppercase *:data-[slot=toggle-group-item]:tracking-wide *:data-[slot=toggle-group-item]:text-[#8B8478] *:data-[state=on]:bg-[#C79A4B]/15! *:data-[state=on]:text-[#C79A4B]! @[767px]/card:flex"
            >
              <ToggleGroupItem value="1d">1 day</ToggleGroupItem>
              <ToggleGroupItem value="5d">5 days</ToggleGroupItem>
              <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
              <ToggleGroupItem value="90d">3 months</ToggleGroupItem>
              <ToggleGroupItem value="180d">6 months</ToggleGroupItem>
              <ToggleGroupItem value="365d">1 year</ToggleGroupItem>
            </ToggleGroup>
            <Select
                value={timeRange}
                onValueChange={(value) => { if (value) setTimeRange(value) }}
            >
              <SelectTrigger
                  className="flex w-40 rounded-sm border-[#C79A4B]/20 bg-transparent text-[#EDE6D8] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                  size="sm"
                  aria-label="Select a value"
              >
                <SelectValue placeholder="Last 3 months" />
              </SelectTrigger>
              <SelectContent className="rounded-sm border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]">
                <SelectItem value="1d" className="rounded-none focus:bg-[#C79A4B]/10">Last 1 day</SelectItem>
                <SelectItem value="5d" className="rounded-none focus:bg-[#C79A4B]/10">Last 5 days</SelectItem>
                <SelectItem value="30d" className="rounded-none focus:bg-[#C79A4B]/10">Last 30 days</SelectItem>
                <SelectItem value="90d" className="rounded-none focus:bg-[#C79A4B]/10">Last 3 months</SelectItem>
                <SelectItem value="180d" className="rounded-none focus:bg-[#C79A4B]/10">Last 6 months</SelectItem>
                <SelectItem value="365d" className="rounded-none focus:bg-[#C79A4B]/10">Last 1 year</SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>

        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {error ? (
              <p className="text-sm text-[#A85D45]">{error}</p>
          ) : loading ? (
              <div className="flex h-[350px] items-center justify-center">
                <p className="font-mono text-xs uppercase tracking-wider text-[#8B8478]">Loading…</p>
              </div>
          ) : (
              <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[350px] w-full"
              >
                <AreaChart data={data} accessibilityLayer>
                  <defs>
                    <linearGradient id="fillClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={trendColor} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#C79A4B" strokeOpacity={0.08} />
                  <XAxis
                      dataKey="timestamp"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tick={{ fill: "#8B8478", fontSize: 11 }}
                      tickFormatter={(value) => formatTick(value, timeRange)}
                  />
                  <YAxis
                      dataKey="close"
                      domain={['auto', 'auto']}
                      hide={true}
                  />

                  {firstClose != null && (
                      <ReferenceLine
                          y={firstClose}
                          stroke="#8B8478"
                          strokeOpacity={0.35}
                          strokeDasharray="3 3"
                      />
                  )}

                  <ChartTooltip
                      cursor={{ stroke: "#C79A4B", strokeOpacity: 0.2 }}
                      content={
                        <ChartTooltipContent
                            className="rounded-sm border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]"
                            labelFormatter={(value) => formatTick(value, timeRange)}
                            indicator="dot"
                        />
                      }
                  />

                  {/* Single area — no stacking. type="linear" plots straight
                      point-to-point segments (like a real trading chart)
                      instead of a smoothed curve that can visually imply
                      price movement between ticks that never happened. */}
                  <Area
                      dataKey="close"
                      type="linear"
                      fill="url(#fillClose)"
                      stroke={trendColor}
                      strokeWidth={1.5}
                  />

                  {chartLatestTime != null && chartLatestBar?.close != null && (
                      <ReferenceDot
                          x={chartLatestTime}
                          y={chartLatestBar.close}
                          r={4}
                          fill={trendColor}
                          stroke="#0C0B09"
                          strokeWidth={2}
                          className="apex-breathe"
                      />
                  )}
                </AreaChart>
              </ChartContainer>
          )}
        </CardContent>
      </Card>
  )
}