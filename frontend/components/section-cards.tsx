"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardHeader } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChartUpIcon, ChartDownIcon, Loading03Icon } from "@hugeicons/core-free-icons"
import { StockItem } from "@/components/MarketTypes"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Trend classification
//
// Treats near-zero moves as "flat" rather than false-positive "up" (the old
// `percentageChange >= 0` check meant an exact 0.00% stock showed as
// "Trending up"). Also treats missing/malformed data as its own state so a
// bad SSE tick or a not-yet-loaded symbol renders "—" instead of crashing
// on `.toFixed(2)` or showing misleading copy.
// ---------------------------------------------------------------------------

type Trend = "up" | "down" | "flat" | "unknown"

const FLAT_THRESHOLD = 0.005 // percent; anything tighter than this reads as "flat," not a real move

function getTrend(percentageChange: number | null | undefined): Trend {
  if (percentageChange == null || Number.isNaN(percentageChange)) return "unknown"
  if (percentageChange > FLAT_THRESHOLD) return "up"
  if (percentageChange < -FLAT_THRESHOLD) return "down"
  return "flat"
}

const TREND_COPY: Record<Trend, string> = {
  up: "Pushing higher",
  down: "Losing ground",
  flat: "Holding steady",
  unknown: "Awaiting data",
}

const TREND_TEXT_COLOR: Record<Trend, string> = {
  up: "text-[#6E8F71]",
  down: "text-[#A85D45]",
  flat: "text-[#8B8478]",
  unknown: "text-[#8B8478]",
}

const TREND_BADGE_CLASS: Record<Trend, string> = {
  up: "border-[#6E8F71]/30 bg-[#6E8F71]/10 text-[#6E8F71]",
  down: "border-[#A85D45]/30 bg-[#A85D45]/10 text-[#A85D45]",
  flat: "border-[#C79A4B]/20 bg-transparent text-[#8B8478]",
  unknown: "border-[#C79A4B]/20 bg-transparent text-[#8B8478]",
}

async function fetchStockList(
    url: string,
    setter: React.Dispatch<React.SetStateAction<StockItem[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const data: StockItem[] = await res.json()

    const mapped: StockItem[] = data
        .filter((item): item is StockItem => item != null)
        .map((item, index) => ({
          ...item,
          id: index + 1,
          volumeDescription: item.volumeDescription ?? "",
        }))

    setter(mapped)
  } catch (err) {
    console.error(`Failed to load stocks from ${url}:`, err)
    toast.error("Failed to load stock data", {
      description: "Could not retrieve tracked assets from the streaming database.",
    })
  } finally {
    setLoading(false)
  }
}

function useCarouselAutoplay(delay: number, cardRef: React.RefObject<HTMLDivElement | null>, hasData: boolean) {
  const [api, setApi] = React.useState<CarouselApi>()

  const plugin = React.useMemo(
      () => Autoplay({ delay, stopOnInteraction: false, stopOnMouseEnter: true }),
      [delay]
  )

  React.useEffect(() => {
    if (!api) return
    api.on("select", () => plugin.reset())
  }, [api, plugin])

  React.useEffect(() => {
    if (!hasData || !cardRef.current) return

    const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (plugin && typeof plugin.play === "function") {
              plugin.play()
            }
          } else {
            plugin.stop()
          }
        },
        { threshold: 0.5 }
    )

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [plugin, cardRef, hasData])

  return { api, setApi, plugin, cardRef }
}

function CarouselBody({
                        isLoading,
                        stocks,
                      }: {
  isLoading: boolean
  stocks: StockItem[]
}) {
  if (isLoading) {
    return (
        <CarouselContent className="-ml-0">
          <CarouselItem className="pl-0">
            <div className="flex h-[104px] w-full items-center justify-center gap-2 px-6 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
              <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-[#C79A4B]" />
              Syncing live streams...
            </div>
          </CarouselItem>
        </CarouselContent>
    )
  }

  if (stocks.length === 0) {
    return (
        <div className="flex flex-1 items-center justify-center py-12 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
          Failed to load stocks.
        </div>
    )
  }

  return (
      <CarouselContent className="-ml-0">
        {stocks.map((stock) => {
          const trend = getTrend(stock.percentageChange)
          const hasPrice = typeof stock.price === "number" && Number.isFinite(stock.price)
          const hasChange = trend !== "unknown"
          const showTrendIcon = trend === "up" || trend === "down"

          return (
              <CarouselItem key={stock.id} className="pl-0">
                <div className="px-6 pt-1 pb-0">
              <span className="mb-0.5 block font-mono text-[11px] font-semibold tracking-[0.25em] text-[#C79A4B]">
                {stock.symbol}
              </span>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold tracking-tight text-[#EDE6D8] tabular-nums @[250px]/card:text-3xl">
                      {hasPrice ? `$${stock.price.toFixed(2)}` : "—"}
                    </h3>
                    <Badge
                        variant="outline"
                        className={`flex shrink-0 items-center gap-1 rounded-sm border font-mono text-xs ${TREND_BADGE_CLASS[trend]}`}
                    >
                      {showTrendIcon && (
                          <HugeiconsIcon
                              icon={trend === "up" ? ChartUpIcon : ChartDownIcon}
                              strokeWidth={2}
                              className="size-3.5"
                          />
                      )}
                      {hasChange
                          ? `${trend === "up" ? "+" : ""}${stock.percentageChange.toFixed(2)}%`
                          : "—"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-1.5 px-6 pt-4 pb-6 text-sm">
                  <div className={`line-clamp-1 flex items-center gap-2 font-medium ${TREND_TEXT_COLOR[trend]}`}>
                    {TREND_COPY[trend]}
                    {showTrendIcon && (
                        <HugeiconsIcon
                            icon={trend === "up" ? ChartUpIcon : ChartDownIcon}
                            strokeWidth={2}
                            className="size-4 shrink-0"
                        />
                    )}
                  </div>
                  <div className="line-clamp-1 text-[#8B8478]">{stock.volumeDescription}</div>
                </div>
              </CarouselItem>
          )
        })}
      </CarouselContent>
  )
}

const CAROUSEL_NAV =
    "relative left-0 top-0 size-7 translate-y-0 rounded-sm border-[#C79A4B]/20 bg-[#0C0B09] text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"

function MarketCarousel({
                          title,
                          isLoading,
                          stocks,
                          delay,
                        }: {
  title: string
  isLoading: boolean
  stocks: StockItem[]
  delay: number
}) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const carousel = useCarouselAutoplay(delay, cardRef, stocks.length > 0)

  return (
      <Card
          ref={cardRef}
          className="@container/card group relative flex max-w-sm flex-col justify-between overflow-hidden rounded-sm border-[#C79A4B]/15 bg-[#0C0B09] text-[#EDE6D8] shadow-none"
      >
        <CardHeader className="px-6 pt-0 pb-0">
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.35em] text-[#C79A4B]">{title}</h2>
        </CardHeader>

        <Carousel
            setApi={carousel.setApi}
            opts={{ loop: true }}
            plugins={[carousel.plugin]}
            className="-mt-6 flex w-full flex-1 flex-col justify-between"
        >
          <CarouselBody isLoading={isLoading} stocks={stocks} />

          <div className="pointer-events-none absolute top-[35%] left-2 z-20 scale-90 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
            <CarouselPrevious className={CAROUSEL_NAV} />
          </div>
          <div className="pointer-events-none absolute top-[35%] right-2 z-20 scale-90 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
            <CarouselNext className={CAROUSEL_NAV} />
          </div>
        </Carousel>
      </Card>
  )
}

export function SectionCards() {
  const [popularStocks, setPopularStocks] = React.useState<StockItem[]>([])
  const [stockGainers, setStockGainers] = React.useState<StockItem[]>([])
  const [stockLosers, setStockLosers] = React.useState<StockItem[]>([])
  const [highestVolumeStocks, sethighestVolumeStocks] = React.useState<StockItem[]>([])

  const [isLoadingPopular, setIsLoadingPopular] = React.useState(true)
  const [isLoadingGainers, setIsLoadingGainers] = React.useState(true)
  const [isLoadingLosers, setIsLoadingLosers] = React.useState(true)
  const [isLoadingVolume, setIsLoadingVolume] = React.useState(true)

  React.useEffect(() => {
    fetchStockList("http://localhost:8080/api/streams/stocks/most-active", setPopularStocks, setIsLoadingPopular)
  }, [])

  React.useEffect(() => {
    fetchStockList("http://localhost:8080/api/streams/stocks/gainers", setStockGainers, setIsLoadingGainers)
  }, [])

  React.useEffect(() => {
    fetchStockList("http://localhost:8080/api/streams/stocks/losers", setStockLosers, setIsLoadingLosers)
  }, [])

  React.useEffect(() => {
    fetchStockList(
        "http://localhost:8080/api/streams/stocks/highest-volume",
        sethighestVolumeStocks,
        setIsLoadingVolume
    )
  }, [])

  React.useEffect(() => {
    const eventSource = new EventSource("http://localhost:8080/api/streams")

    eventSource.addEventListener("TICK", (event) => {
      const tick = JSON.parse(event.data)
      setPopularStocks((prev) =>
          prev.map((stock) =>
              stock.symbol === tick.S ? { ...stock, price: tick.p, percentageChange: tick.percentageChange } : stock
          )
      )
    })

    return () => eventSource.close()
  }, [])

  return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <MarketCarousel title="MOST ACTIVE" isLoading={isLoadingPopular} stocks={popularStocks} delay={4000} />
        <MarketCarousel title="GAINERS" isLoading={isLoadingGainers} stocks={stockGainers} delay={5500} />
        <MarketCarousel title="LOSERS" isLoading={isLoadingLosers} stocks={stockLosers} delay={7000} />
        <MarketCarousel title="HIGHEST VOLUME" isLoading={isLoadingVolume} stocks={highestVolumeStocks} delay={8500} />
      </div>
  )
}