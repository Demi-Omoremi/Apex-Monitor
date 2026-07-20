"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel, CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import {ChartUpIcon, ChartDownIcon, Loading03Icon} from "@hugeicons/core-free-icons"
import {MarketTick, StockItem} from "@/components/MarketTypes";
import {toast} from "sonner";
import { Skeleton } from "@/components/ui/skeleton"




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
          volumeDescription: item.volumeDescription ?? ""
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
  // 2. REMOVED the duplicate cardRef declaration here!

  const plugin = React.useMemo(
      () => Autoplay({ delay, stopOnInteraction: false, stopOnMouseEnter: true }),
      [delay]
  )

  React.useEffect(() => {
    if (!api) return
    api.on("select", () => plugin.reset())
  }, [api, plugin])

  React.useEffect(() => {
    // 3. hasData is now safely defined from the parameters
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

export function SectionCards() {
  const card1Ref = React.useRef<HTMLDivElement>(null)
  const card2Ref = React.useRef<HTMLDivElement>(null)
  const card3Ref = React.useRef<HTMLDivElement>(null)
  const card4Ref = React.useRef<HTMLDivElement>(null)

  const [stocks] = React.useState<StockItem[]>([
    { id: 1, symbol: "AAPL", price: 182.40, percentageChange: 1.25, volumeDescription: "High retail buying volume" },
    { id: 2, symbol: "NVDA", price: 915.00, percentageChange: 5.42, volumeDescription: "Institutional accumulation detected" },
    { id: 3, symbol: "MSFT", price: 415.60, percentageChange: -0.85, volumeDescription: "Consolidating near key support" },
    { id: 4, symbol: "TSLA", price: 174.25, percentageChange: -2.10, volumeDescription: "Short-term options volatility" },
  ])

  const [popularStocks, setPopularStocks] = React.useState<StockItem[]>([]);
  const [stockGainers, setStockGainers] = React.useState<StockItem[]>([]);
  const [stockLosers, setStockLosers] = React.useState<StockItem[]>([]);
  const [highestVolumeStocks, sethighestVolumeStocks] = React.useState<StockItem[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);

  const c1 = useCarouselAutoplay(4000, card1Ref, popularStocks.length > 0)
  const c2 = useCarouselAutoplay(5500, card2Ref, stockGainers.length > 0)
  const c3 = useCarouselAutoplay(7000, card3Ref, stockLosers.length > 0)
  const c4 = useCarouselAutoplay(8500, card4Ref, highestVolumeStocks.length > 0)



// Initial load
// popular stocks
  React.useEffect(() => {
    fetchStockList("http://localhost:8080/api/streams/stocks/most-active", setPopularStocks, setIsLoading)// ← now runs after fetch resolves
  }, [])

  React.useEffect(() => {
    fetchStockList("http://localhost:8080/api/streams/stocks/gainers", setStockGainers, setIsLoading)// ← now runs after fetch resolves
  }, [])

  React.useEffect(() => {
    fetchStockList("http://localhost:8080/api/streams/stocks/losers", setStockLosers, setIsLoading)// ← now runs after fetch resolves
  }, [])

  React.useEffect(() => {
    fetchStockList("http://localhost:8080/api/streams/stocks/highest-volume", sethighestVolumeStocks, setIsLoading)// ← now runs after fetch resolves
  }, [])



//Live updates
  //popularStocks
  React.useEffect(() => {
    const eventSource = new EventSource("http://localhost:8080/api/streams");

    eventSource.addEventListener("TICK", (event) => {
      const tick = JSON.parse(event.data);
      setPopularStocks(prev =>
          prev.map(stock =>
              stock.symbol === tick.S
                  ? { ...stock, price: tick.p, percentageChange: tick.percentageChange }
                  : stock
          )
      );
    });

    return () => eventSource.close();
  }, []);



  return (
      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">

        {/* CARD 1: DYNAMIC US STOCKS CAROUSEL */}
        <Card ref={card1Ref} className="@container/card max-w-sm overflow-hidden border shadow-sm relative group flex flex-col justify-between">

          <CardHeader className="px-6 pt-0 pb-0">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground/80">
              MOST ACTIVE STOCKS
            </h2>
          </CardHeader>

          <Carousel
              setApi={c1.setApi}
              opts={{ loop: true }}
              plugins={[c1.plugin]}
              className="w-full flex-1 flex flex-col justify-between -mt-6"
          >
            {isLoading ? (
                <div className="flex flex-col flex-1">
                  <Skeleton className="h-8 mx-6 mt-1 mb-2" />
                  <Skeleton className="flex-1 mx-6 " />
                </div>
            ) : popularStocks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
                  Failed to load stocks.
                </div>
            ) : (
              <CarouselContent className="-ml-0">
                {popularStocks.map((stock) => {
                  const isPositive = stock.percentageChange >= 0

                  return (
                      <CarouselItem key={stock.id} className="pl-0">
                        <div className="px-6 pt-1 pb-0">
                      <span className="text-xs font-bold text-muted-foreground/70 tracking-wider block mb-0.5">
                        {stock.symbol}
                      </span>
                          <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-semibold tracking-tight tabular-nums @[250px]/card:text-3xl">
                              ${stock.price.toFixed(2)}
                            </h3>
                            <Badge
                                variant={isPositive ? "outline" : "destructive"}
                                className="flex gap-1 items-center shrink-0"
                            >
                              <HugeiconsIcon
                                  icon={isPositive ? ChartUpIcon : ChartDownIcon}
                                  strokeWidth={2}
                                  className="size-3.5"
                              />
                              {isPositive ? "+" : ""}{stock.percentageChange.toFixed(2)}%
                            </Badge>
                          </div>
                        </div>

                        {/* Sliding Footer Content */}
                        <div className="px-6 pt-4 pb-6 flex flex-col gap-1.5 text-sm mt-auto">
                          <div className="line-clamp-1 flex gap-2 font-medium items-center">
                            {isPositive ? "Trending up this period" : "Downside movement detected"}{" "}
                            <HugeiconsIcon
                                icon={isPositive ? ChartUpIcon : ChartDownIcon}
                                strokeWidth={2}
                                className="size-4 shrink-0"
                            />
                          </div>
                          <div className="text-muted-foreground line-clamp-1">
                            {stock.volumeDescription}
                          </div>
                        </div>
                      </CarouselItem>
                  )
                })}
              </CarouselContent>
            )}
            {/* Floating Controls */}
            <div className="absolute left-2 top-[35%] z-20 transition-all duration-300 opacity-0 pointer-events-none scale-90 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100">
              <CarouselPrevious className="relative left-0 top-0 translate-y-0 size-7" />
            </div>
            <div className="absolute right-2 top-[35%] z-20 transition-all duration-300 opacity-0 pointer-events-none scale-90 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100">
              <CarouselNext className="relative left-0 top-0 translate-y-0 size-7" />
            </div>
          </Carousel>
        </Card>
        {/* CARD 2: STOCK GAINERS */}
        <Card ref={card2Ref} className="@container/card max-w-sm overflow-hidden border shadow-sm relative group flex flex-col justify-between">

          <CardHeader className="px-6 pt-0 pb-0">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground/80">
              Stock Gainers
            </h2>
          </CardHeader>

          <Carousel
              setApi={c2.setApi}
              opts={{ loop: true }}
              plugins={[c2.plugin]}
              className="w-full flex-1 flex flex-col justify-between -mt-6"
          >
            <CarouselContent className="-ml-0">
              {stockGainers.map((stock) => {
                const isPositive = stock.percentageChange >= 0

                return (
                    <CarouselItem key={stock.id} className="pl-0">
                      <div className="px-6 pt-1 pb-0">
                    <span className="text-xs font-bold text-muted-foreground/70 tracking-wider block mb-0.5">
                      {stock.symbol}
                    </span>
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-semibold tracking-tight tabular-nums @[250px]/card:text-3xl">
                            ${stock.price.toFixed(2)}
                          </h3>
                          <Badge
                              variant={isPositive ? "outline" : "destructive"}
                              className="flex gap-1 items-center shrink-0"
                          >
                            <HugeiconsIcon
                                icon={isPositive ? ChartUpIcon : ChartDownIcon}
                                strokeWidth={2}
                                className="size-3.5"
                            />
                            {isPositive ? "+" : ""}{stock.percentageChange.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>

                      {/* Sliding Footer Content */}
                      <div className="px-6 pt-4 pb-6 flex flex-col gap-1.5 text-sm mt-auto">
                        <div className="line-clamp-1 flex gap-2 font-medium items-center">
                          {isPositive ? "Trending up this period" : "Downside movement detected"}{" "}
                          <HugeiconsIcon
                              icon={isPositive ? ChartUpIcon : ChartDownIcon}
                              strokeWidth={2}
                              className="size-4 shrink-0"
                          />
                        </div>
                        <div className="text-muted-foreground line-clamp-1">
                          {stock.volumeDescription}
                        </div>
                      </div>
                    </CarouselItem>
                )
              })}
            </CarouselContent>

            {/* Floating Controls */}
            <CarouselPrevious className="absolute left-2 top-[35%] size-7 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-20" />
            <CarouselNext className="absolute right-2 top-[35%] size-7 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-20" />
          </Carousel>
        </Card>

        {/* CARD 3: STOCK LOSERS */}
        <Card ref={card3Ref} className="@container/card max-w-sm overflow-hidden border shadow-sm relative group flex flex-col justify-between">

          <CardHeader className="px-6 pt-0 pb-0">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground/80">
              Stock Losers
            </h2>
          </CardHeader>

          <Carousel
              setApi={c3.setApi}
              opts={{ loop: true }}
              plugins={[c3.plugin]}
              className="w-full flex-1 flex flex-col justify-between -mt-6"
          >
            <CarouselContent className="-ml-0">
              {stockLosers.map((stock) => {
                const isPositive = stock.percentageChange >= 0

                return (
                    <CarouselItem key={stock.id} className="pl-0">
                      <div className="px-6 pt-1 pb-0">
                    <span className="text-xs font-bold text-muted-foreground/70 tracking-wider block mb-0.5">
                      {stock.symbol}
                    </span>
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-semibold tracking-tight tabular-nums @[250px]/card:text-3xl">
                            ${stock.price.toFixed(2)}
                          </h3>
                          <Badge
                              variant={isPositive ? "outline" : "destructive"}
                              className="flex gap-1 items-center shrink-0"
                          >
                            <HugeiconsIcon
                                icon={isPositive ? ChartUpIcon : ChartDownIcon}
                                strokeWidth={2}
                                className="size-3.5"
                            />
                            {isPositive ? "+" : ""}{stock.percentageChange.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>

                      {/* Sliding Footer Content */}
                      <div className="px-6 pt-4 pb-6 flex flex-col gap-1.5 text-sm mt-auto">
                        <div className="line-clamp-1 flex gap-2 font-medium items-center">
                          {isPositive ? "Trending up this period" : "Downside movement detected"}{" "}
                          <HugeiconsIcon
                              icon={isPositive ? ChartUpIcon : ChartDownIcon}
                              strokeWidth={2}
                              className="size-4 shrink-0"
                          />
                        </div>
                        <div className="text-muted-foreground line-clamp-1">
                          {stock.volumeDescription}
                        </div>
                      </div>
                    </CarouselItem>
                )
              })}
            </CarouselContent>

            {/* Floating Controls */}
            <CarouselPrevious className="absolute left-2 top-[35%] size-7 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-20" />
            <CarouselNext className="absolute right-2 top-[35%] size-7 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-20" />
          </Carousel>
        </Card>

        {/* CARD 4: HIGHEST VOLUME STOCK */}
        <Card ref={card4Ref} className="@container/card max-w-sm overflow-hidden border shadow-sm relative group flex flex-col justify-between">

          <CardHeader className="px-6 pt-0 pb-0">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground/80">
              HIGHEST VOLUME STOCK
            </h2>
          </CardHeader>

          <Carousel
              setApi={c4.setApi}
              opts={{ loop: true }}
              plugins={[c4.plugin]}
              className="w-full flex-1 flex flex-col justify-between -mt-6"
          >
            <CarouselContent className="-ml-0">
              {highestVolumeStocks.map((stock) => {
                const isPositive = stock.percentageChange >= 0

                return (
                    <CarouselItem key={stock.id} className="pl-0">
                      <div className="px-6 pt-1 pb-0">
                    <span className="text-xs font-bold text-muted-foreground/70 tracking-wider block mb-0.5">
                      {stock.symbol}
                    </span>
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-semibold tracking-tight tabular-nums @[250px]/card:text-3xl">
                            ${stock.price.toFixed(2)}
                          </h3>
                          <Badge
                              variant={isPositive ? "outline" : "destructive"}
                              className="flex gap-1 items-center shrink-0"
                          >
                            <HugeiconsIcon
                                icon={isPositive ? ChartUpIcon : ChartDownIcon}
                                strokeWidth={2}
                                className="size-3.5"
                            />
                            {isPositive ? "+" : ""}{stock.percentageChange.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>

                      {/* Sliding Footer Content */}
                      <div className="px-6 pt-4 pb-6 flex flex-col gap-1.5 text-sm mt-auto">
                        <div className="line-clamp-1 flex gap-2 font-medium items-center">
                          {isPositive ? "Trending up this period" : "Downside movement detected"}{" "}
                          <HugeiconsIcon
                              icon={isPositive ? ChartUpIcon : ChartDownIcon}
                              strokeWidth={2}
                              className="size-4 shrink-0"
                          />
                        </div>
                        <div className="text-muted-foreground line-clamp-1">
                          {stock.volumeDescription}
                        </div>
                      </div>
                    </CarouselItem>
                )
              })}
            </CarouselContent>

            {/* Floating Controls */}
            <CarouselPrevious className="absolute left-2 top-[35%] size-7 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-20" />
            <CarouselNext className="absolute right-2 top-[35%] size-7 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-20" />
          </Carousel>
        </Card>

      </div>
  )
}