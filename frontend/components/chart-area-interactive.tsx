"use client"

import * as React from "react"
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from "recharts"

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


export const description = "An interactive area chart"

const chartConfig = {
  close: {
    label: "price",
    color: "var(--primary)",
  },
  timestamp: {
    label: "time",
    color: "var(--primary)",
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
    loading: boolean
    error: string | null
  }>({ data: [], loading: true, error: null })

  React.useEffect(() => {
    if (!symbol) return

    const tf = TIMEFRAME_LABELS[timeRange] ?? "3M"

    fetch(`http://localhost:8080/api/streams/${symbol}/historical-bars?tf=${tf}`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
          return res.json() as Promise<MarketBar[]>
        })
        .then((data) => setState({ data, loading: false, error: null }))
        .catch((err: Error) => setState({ data: [], loading: false, error: err.message }))
  }, [symbol, timeRange])

  return state
}

export function ChartAreaInteractive({ symbol }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState(() => isMobile ? "5d" : "90d")

  const { data, loading, error } = useMarketBars(symbol, timeRange)


  // Derive symbol + latest close for the header
  const latestBar  = data[data.length - 1]
  const latestClose = latestBar?.close
  const latestTime = latestBar?.timestamp

  // Use the last bar's timestamp as the reference "today"




  return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>
            {symbol}{" "}
            {latestClose != null && (
                <span className="text-muted-foreground font-normal">
              ${latestClose.toFixed(2)} USD
            </span>
            )}
          </CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">Close price · last 3 months</span>
            <span className="@[540px]/card:hidden">Last 3 months</span>
          </CardDescription>
          <CardAction>
            <ToggleGroup
                multiple={false}
                value={timeRange ? [timeRange] : []}
                onValueChange={(value) => setTimeRange(value[0] ?? "90d")}
                variant="outline"
                className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
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
                  className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                  size="sm"
                  aria-label="Select a value"
              >
                <SelectValue placeholder="Last 3 months" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="1d"   className="rounded-lg">Last 1 day</SelectItem>
                <SelectItem value="5d"   className="rounded-lg">Last 5 days</SelectItem>
                <SelectItem value="30d"  className="rounded-lg">Last 30 days</SelectItem>
                <SelectItem value="90d"  className="rounded-lg">Last 3 months</SelectItem>
                <SelectItem value="180d" className="rounded-lg">Last 6 months</SelectItem>
                <SelectItem value="365d" className="rounded-lg">Last 1 year</SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>

        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {error ? (
              <p className="text-destructive text-sm">{error}</p>
          ) : loading ? (
              <div className="h-[350px] flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Loading…</p>
              </div>
          ) : (
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[350px] w-full"
            >
              <AreaChart data={data} accessibilityLayer>
                <defs>
                  <linearGradient id="fillClose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-close)" stopOpacity={1.0} />
                    <stop offset="95%" stopColor="var(--color-close)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="timestamp"        // ← was "date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) => formatTick(value, timeRange)}

                />
                <YAxis
                    dataKey="close"
                    domain={['auto', 'auto']}
                    hide={true}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                          labelFormatter={(value) => formatTick(value, timeRange)}
                          indicator="dot"
                      />
                    }
                />
                {/* Single area — no stacking */}
                <Area
                    dataKey="close"
                    type="natural"
                    fill="url(#fillClose)"
                    stroke="var(--color-close)"
                />
              </AreaChart>
            </ChartContainer>
              )}
        </CardContent>
      </Card>
  )
}