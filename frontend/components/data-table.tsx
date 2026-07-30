"use client"

import * as React from "react"
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { z } from "zod"
import { AlertRule, alertRuleSchema, NewsItem, newsSchema, schema, triggeredAlertSchema, type StockRowData, type TriggeredAlert } from "./MarketTypes"

import { useIsMobile } from "@/hooks/use-mobile"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    DragDropVerticalIcon,
    Loading03Icon,
    MoreVerticalCircle01Icon,
    Add01Icon,
    ArrowUpBigIcon,
    ArrowDownBigIcon,
    StarIcon,
} from "@hugeicons/core-free-icons"
import { useSse } from "@/components/SseContext"
import { CreateAlertDialog } from "@/components/create-alert-dialog"

function formatTimestamp(value: string): string {
    const date = new Date(value)
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })
}

function usePriceFlash(price: string | number) {
    const prevPriceRef = React.useRef(price)
    const [flash, setFlash] = React.useState<"up" | "down" | null>(null)

    React.useEffect(() => {
        const prev = parseFloat(String(prevPriceRef.current).replace(/[^0-9.-]/g, ""))
        const curr = parseFloat(String(price).replace(/[^0-9.-]/g, ""))
        if (!Number.isNaN(prev) && !Number.isNaN(curr) && curr !== prev) {
            setFlash(curr > prev ? "up" : "down")
            const timeout = setTimeout(() => setFlash(null), 900)
            prevPriceRef.current = price
            return () => clearTimeout(timeout)
        }
        prevPriceRef.current = price
    }, [price])

    return flash
}

function isAlertActive(alert: AlertRule, livePrice?: string | number): boolean {
    if (livePrice === undefined) return false
    const curr = parseFloat(String(livePrice).replace(/[^0-9.-]/g, ""))
    if (Number.isNaN(curr)) return false
    const condition = alert.condition.toUpperCase()
    if (condition.includes("ABOVE")) return curr >= alert.targetPrice
    if (condition.includes("BELOW")) return curr <= alert.targetPrice
    return false
}

function DragHandle({ id }: { id: string }) {
    const { attributes, listeners } = useSortable({ id })
    return (
        <Button
            {...attributes}
            {...listeners}
            variant="ghost"
            size="icon"
            className="size-7 text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"
        >
            <HugeiconsIcon icon={DragDropVerticalIcon} strokeWidth={2} className="size-3" />
            <span className="sr-only">Drag to reorder</span>
        </Button>
    )
}

function FavoriteToggle({ isFavorite, onClick }: { isFavorite: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`shrink-0 transition-colors ${
                isFavorite ? "text-[#C79A4B]" : "text-[#8B8478]/40 hover:text-[#C79A4B]"
            }`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
            <HugeiconsIcon icon={StarIcon} strokeWidth={2} className="size-5" />
        </button>
    )
}

function AlertRow({
                      item,
                      isFavorite,
                      isActive,
                      livePrice,
                      onToggleFavorite,
                      onDelete,
                  }: {
    item: AlertRule
    isFavorite: boolean
    isActive: boolean
    livePrice?: string | number
    onToggleFavorite: (id: string, currentlyFavorite: boolean) => void
    onDelete: (id: string) => void
}) {
    const isAbove = item.condition.includes("ABOVE")
    const flash = usePriceFlash(livePrice ?? item.targetPrice)

    return (
        <div
            className={`flex items-center justify-between border-b border-[#C79A4B]/10 px-1 py-4 transition-colors last:border-b-0 hover:bg-[#C79A4B]/[0.03] ${
                isActive ? "bg-[#A85D45]/[0.06]" : ""
            }`}
        >
            <div className="flex items-center gap-4">
                <FavoriteToggle isFavorite={isFavorite} onClick={() => onToggleFavorite(item.id, isFavorite)} />
                <div className="flex size-10 items-center justify-center rounded-sm border border-[#C79A4B]/15 bg-[#C79A4B]/5">
                    <HugeiconsIcon
                        icon={isAbove ? ArrowUpBigIcon : ArrowDownBigIcon}
                        strokeWidth={2}
                        className={`size-5 ${isAbove ? "text-[#6E8F71]" : "text-[#A85D45]"}`}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold leading-none text-[#EDE6D8]">{item.symbol}</span>
                        <Badge
                            variant="outline"
                            className="rounded-sm border-[#C79A4B]/25 bg-transparent text-[10px] uppercase tracking-wider text-[#8B8478]"
                        >
                            {item.condition}
                        </Badge>
                        {isActive && (
                            <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#A85D45]">
                                <span className="apex-breathe inline-block size-1.5 rounded-full bg-[#A85D45]" />
                                Triggered
                            </span>
                        )}
                    </div>
                    <span className="font-mono text-sm text-[#8B8478]">
                        Target <span className="text-[#EDE6D8]">${item.targetPrice.toFixed(2)}</span>
                        {livePrice !== undefined && (
                            <>
                                {"  ·  "}Live{" "}
                                <span
                                    className={`transition-colors duration-500 ${
                                        flash === "up" ? "text-[#6E8F71]" : flash === "down" ? "text-[#A85D45]" : "text-[#EDE6D8]"
                                    }`}
                                >
                                    ${livePrice}
                                </span>
                            </>
                        )}
                    </span>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" className="text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]" />}
                >
                    <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
                    <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36" style={{ backgroundColor: "#0C0B09", color: "#EDE6D8", borderColor: "rgba(199,154,75,0.2)" }}>
                    <DropdownMenuItem
                        className="font-mono text-xs uppercase tracking-wide"
                        onClick={() => onToggleFavorite(item.id, isFavorite)}
                    >
                        {isFavorite ? "Unfavorite" : "Favorite"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#C79A4B]/10" />
                    <DropdownMenuItem
                        variant="destructive"
                        className="font-mono text-xs uppercase tracking-wide"
                        style={{ color: "#A85D45" }}
                        onClick={() => onDelete(item.id)}
                    >
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

function TriggeredAlertRow({ item }: { item: TriggeredAlert }) {
    const isAbove = item.condition.includes("ABOVE")

    return (
        <div className="flex items-center justify-between border-b border-[#C79A4B]/10 px-1 py-4 transition-colors last:border-b-0 hover:bg-[#C79A4B]/[0.03]">
            <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-sm border border-[#A85D45]/25 bg-[#A85D45]/10">
                    <HugeiconsIcon
                        icon={isAbove ? ArrowUpBigIcon : ArrowDownBigIcon}
                        strokeWidth={2}
                        className={`size-5 ${isAbove ? "text-[#6E8F71]" : "text-[#A85D45]"}`}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold leading-none text-[#EDE6D8]">{item.symbol}</span>
                        <Badge
                            variant="outline"
                            className="rounded-sm border-[#A85D45]/30 bg-[#A85D45]/10 text-[10px] uppercase tracking-wider text-[#A85D45]"
                        >
                            {item.condition}
                        </Badge>
                        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#A85D45]">
                            <span className="apex-breathe inline-block size-1.5 rounded-full bg-[#A85D45]" />
                            Fired
                        </span>
                    </div>
                    <span className="font-mono text-sm text-[#8B8478]">
                        Target <span className="text-[#EDE6D8]">${item.targetPrice.toFixed(2)}</span>
                        {"  ·  "}Hit{" "}
                        <span className="text-[#A85D45]">${item.triggeredPrice.toFixed(2)}</span>
                        {"  ·  "}
                        <span className="text-[#C79A4B]">{formatTimestamp(item.timestamp)}</span>
                    </span>
                </div>
            </div>
        </div>
    )
}

function NewsRow({ item }: { item: NewsItem }) {
    return (
        <div className="border-b border-[#C79A4B]/10 py-4 transition-colors last:border-b-0 hover:bg-[#C79A4B]/[0.03]">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider text-[#8B8478]">
                <span>{item.source}</span>
                <span className="text-[#C79A4B]">{new Date(item.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1.5 font-medium text-[#EDE6D8]">{item.headline}</p>
            <p className="line-clamp-2 text-sm text-[#8B8478]">{item.summary}</p>
            <div className="mt-2 flex gap-1.5">
                {item.symbols.map((s) => (
                    <Badge
                        key={s}
                        variant="outline"
                        className="rounded-sm border-[#C79A4B]/25 bg-transparent px-1.5 font-mono text-[#8B8478]"
                    >
                        {s}
                    </Badge>
                ))}
            </div>
        </div>
    )
}

function StockRow({
                      item,
                      isFavorite,
                      onToggleFavorite,
                      onDelete,
                  }: {
    item: StockRowData
    isFavorite: boolean
    onToggleFavorite: (id: string, currentlyFavorite: boolean) => void
    onDelete: (id: string) => void
}) {
    const flash = usePriceFlash(item.price)

    return (
        <div className="flex items-center justify-between border-b border-[#C79A4B]/10 px-1 py-4 transition-colors last:border-b-0 hover:bg-[#C79A4B]/[0.03]">
            <div className="flex items-center gap-3">
                <DragHandle id={item.id} />
                <FavoriteToggle isFavorite={isFavorite} onClick={() => onToggleFavorite(item.id, isFavorite)} />
                <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-[#C79A4B]/20 bg-[#C79A4B]/5 font-mono text-xs font-bold text-[#C79A4B]">
                    {item.symbol.slice(0, 2)}
                </div>
                <TableCellViewer item={item} />
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden flex-col items-end gap-1 sm:flex">
                    <Badge
                        variant="outline"
                        className="rounded-sm border-[#C79A4B]/25 bg-transparent px-1.5 font-mono text-[#8B8478]"
                    >
                        {item.size}
                    </Badge>
                    <span className="font-mono text-xs text-[#8B8478]">{formatTimestamp(item.timestamp)}</span>
                </div>
                <span
                    className={`font-mono text-lg font-bold tabular-nums transition-colors duration-500 ${
                        flash === "up" ? "text-[#6E8F71]" : flash === "down" ? "text-[#A85D45]" : "text-[#EDE6D8]"
                    }`}
                >
                    ${item.price}
                </span>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" className="text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]" />}
                    >
                        <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
                        <span className="sr-only">Open menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36" style={{ backgroundColor: "#0C0B09", color: "#EDE6D8", borderColor: "rgba(199,154,75,0.2)" }}>
                        <DropdownMenuItem
                            className="font-mono text-xs uppercase tracking-wide"
                            onClick={() => onToggleFavorite(item.id, isFavorite)}
                        >
                            {isFavorite ? "Unfavorite" : "Favorite"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#C79A4B]/10" />
                        <DropdownMenuItem
                            variant="destructive"
                            className="font-mono text-xs uppercase tracking-wide"
                            style={{ color: "#A85D45" }}
                            onClick={() => onDelete(item.id)}
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

function SortableStockCard(props: {
    item: StockRowData
    isFavorite: boolean
    onToggleFavorite: (id: string, currentlyFavorite: boolean) => void
    onDelete: (id: string) => void
}) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({ id: props.item.id })
    return (
        <div
            ref={setNodeRef}
            data-dragging={isDragging}
            className="relative data-[dragging=true]:z-10 data-[dragging=true]:bg-[#0C0B09] data-[dragging=true]:opacity-90 data-[dragging=true]:ring-1 data-[dragging=true]:ring-[#C79A4B]/30"
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            <StockRow {...props} />
        </div>
    )
}

function useDominantColor(src: string) {
    const [color, setColor] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!src) return
        let cancelled = false
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = src

        img.onload = () => {
            if (cancelled) return
            try {
                const size = 10
                const canvas = document.createElement("canvas")
                canvas.width = size
                canvas.height = size
                const ctx = canvas.getContext("2d")
                if (!ctx) return
                ctx.drawImage(img, 0, 0, size, size)
                const { data } = ctx.getImageData(0, 0, size, size)

                // sample the four corners — usually the logo's actual background, not the icon itself
                const corners = [0, (size - 1) * 4, (size - 1) * size * 4, (size * size - 1) * 4]
                let r = 0, g = 0, b = 0
                corners.forEach((i) => { r += data[i]; g += data[i + 1]; b += data[i + 2] })
                setColor(`rgb(${Math.round(r / 4)}, ${Math.round(g / 4)}, ${Math.round(b / 4)})`)
            } catch {
                setColor(null) // canvas tainted by CORS — fall back silently
            }
        }
        img.onerror = () => setColor(null)

        return () => { cancelled = true }
    }, [src])

    return color
}

function ConfirmClearAllDialog({
                                   count,
                                   label,
                                   onConfirm,
                               }: {
    count: number
    label: string
    onConfirm: () => void
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-sm border-[#A85D45]/40 font-mono text-xs uppercase tracking-wide text-[#A85D45] hover:bg-[#A85D45]/10 hover:text-[#A85D45] disabled:opacity-30"
                        disabled={count === 0}
                    />
                }
            >
                Clear All
            </AlertDialogTrigger>
            <AlertDialogContent className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8] sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-mono uppercase tracking-widest text-[#C79A4B]">
                        Clear all {label}?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#8B8478]">
                        This removes all {count} {label} you&#39;re currently tracking. This can&#39;t be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        variant="outline"
                        className="rounded-sm border-[#C79A4B]/20 text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#EDE6D8]"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="rounded-sm bg-[#A85D45] text-[#EDE6D8] hover:bg-[#A85D45]/90 focus-visible:ring-[#A85D45]/40"
                    >
                        Clear All
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function DataTable({ symbol }: { symbol: string }) {
    const source = useSse()

    const [data, setData] = React.useState<StockRowData[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [favoriteStocks, setFavoriteStocks] = React.useState<Set<string>>(new Set())

    const [marketNews, setMarketNews] = React.useState<NewsItem[]>([])
    const [companyNews, setCompanyNews] = React.useState<NewsItem[]>([])
    const [isNewsLoading, setIsNewsLoading] = React.useState(true)

    const [alerts, setAlerts] = React.useState<AlertRule[]>([])
    const [isAlertsLoading, setIsAlertsLoading] = React.useState(true)
    const [favoriteAlerts, setFavoriteAlerts] = React.useState<Set<string>>(new Set())

    const [triggeredAlerts, setTriggeredAlerts] = React.useState<TriggeredAlert[]>([])
    const [subscriptionLimit, setSubscriptionLimit] = React.useState<{ count: number; max: number } | null>(null)

    // initial subscription snapshot
    React.useEffect(() => {
        const controller = new AbortController()

        async function loadSubscriptions() {
            try {
                const response = await fetch("http://localhost:8080/api/streams/subscription", {
                    signal: controller.signal,
                })
                if (!response.ok) throw new Error(`Failed to pull streaming channels: ${response.status}`)

                const backendData = await response.json()
                setData(z.array(schema).parse(backendData))
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") return
                console.error("Backend synchronisation failure:", error)
                toast.error("Failed to sync subscriptions", {
                    description: "Could not retrieve tracked assets from the streaming database.",
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadSubscriptions()
        return () => controller.abort()
    }, [])

    React.useEffect(() => {
        async function loadSubscriptionLimit() {
            try {
                const response = await fetch("http://localhost:8080/api/streams/subscription/limit")
                if (!response.ok) return
                const body = (await response.json()) as { count: number; max: number }
                setSubscriptionLimit(body)
            } catch {
                // non-fatal
            }
        }
        loadSubscriptionLimit()
    }, [])

    // initial news snapshot
    React.useEffect(() => {
        async function loadNews() {
            try {
                const [marketRes, companyRes] = await Promise.all([
                    fetch("http://localhost:8080/api/streams/market/news"),
                    fetch(`http://localhost:8080/api/streams/${symbol}/news`),
                ])
                if (!marketRes.ok || !companyRes.ok) throw new Error("Failed to pull news")

                const [marketData, companyData] = await Promise.all([marketRes.json(), companyRes.json()])
                setMarketNews(z.array(newsSchema).parse(marketData))
                setCompanyNews(z.array(newsSchema).parse(companyData))
            } catch (error) {
                console.error("News sync failure:", error)
                toast.error("Failed to sync market news")
            } finally {
                setIsNewsLoading(false)
            }
        }
        loadNews()
    }, [symbol])



    // initial alerts snapshot
    React.useEffect(() => {
        async function loadAlerts() {
            try {
                const [alertsRes, triggeredRes] = await Promise.all([
                    fetch("http://localhost:8080/api/streams/alerts"),
                    fetch("http://localhost:8080/api/streams/alerts/triggered"),
                ])
                if (!alertsRes.ok) throw new Error("Failed to pull alerts")

                const alertsData = await alertsRes.json()
                setAlerts(z.array(alertRuleSchema).parse(alertsData))

                if (triggeredRes.ok) {
                    const triggeredData = await triggeredRes.json()
                    setTriggeredAlerts(z.array(triggeredAlertSchema).parse(triggeredData))
                }
            } catch (error) {
                console.error("Alerts sync failure:", error)
                toast.error("Failed to sync alerts")
            } finally {
                setIsAlertsLoading(false)
            }
        }
        loadAlerts()
    }, [])

    // live updates — single shared SSE connection, multiple named listeners
    React.useEffect(() => {
        if (!source) return

        function handleTick(event: MessageEvent) {
            const tick = schema.parse(JSON.parse(event.data))
            setData((prev) => prev.map((item) => (item.symbol === tick.symbol ? { ...item, ...tick } : item)))
        }

        function handleAlert(event: MessageEvent) {
            try {
                const newAlert = alertRuleSchema.parse(JSON.parse(event.data))
                setAlerts((prev) => {
                    if (prev.some((a) => a.id === newAlert.id)) return prev
                    return [...prev, newAlert]
                })
            } catch (error) {
                console.error("Failed to parse created-alert SSE event:", error)
            }
        }

        function handleAlertRemoved(event: MessageEvent) {
            try {
                const { id } = JSON.parse(event.data) as { id: string | number }
                const removedId = String(id)
                setAlerts((prev) => prev.filter((a) => a.id !== removedId))
                setFavoriteAlerts((prev) => {
                    if (!prev.has(removedId)) return prev
                    const next = new Set(prev)
                    next.delete(removedId)
                    return next
                })
            } catch (error) {
                console.error("Failed to parse alert-removed SSE event:", error)
            }
        }

        function handleAlertUpdate(event: MessageEvent) {
            try {
                const triggered = triggeredAlertSchema.parse(JSON.parse(event.data))
                setTriggeredAlerts((prev) => {
                    const key = `${triggered.id}-${triggered.timestamp}`
                    if (prev.some((a) => `${a.id}-${a.timestamp}` === key)) return prev
                    return [triggered, ...prev]
                })
                toast.info(`${triggered.symbol} alert triggered`, {
                    description: `Hit $${triggered.triggeredPrice.toFixed(2)} (${triggered.condition} $${triggered.targetPrice.toFixed(2)})`,
                })
            } catch (error) {
                console.error("Failed to parse alert-update SSE event:", error, event.data)
            }
        }

        function refreshSubscriptionLimit() {
            fetch("http://localhost:8080/api/streams/subscription/limit")
                .then((res) => (res.ok ? res.json() : null))
                .then((body: { count: number; max: number } | null) => {
                    if (body) setSubscriptionLimit(body)
                })
                .catch(() => {})
        }

        function handleSubscriptionAdded(event: MessageEvent) {
            const tick = schema.parse(JSON.parse(event.data))
            setData((prev) => {
                if (prev.some((item) => item.symbol.toUpperCase() === tick.symbol.toUpperCase())) return prev
                return [...prev, tick]
            })
            refreshSubscriptionLimit()
        }

        function handleSubscriptionRemoved(event: MessageEvent) {
            const { symbol } = JSON.parse(event.data) as { symbol: string }
            setData((prev) => prev.filter((item) => item.symbol.toUpperCase() !== symbol.toUpperCase()))
            setFavoriteStocks((prev) => {
                const next = new Set(prev)
                next.delete(symbol)
                return next
            })
            refreshSubscriptionLimit()
        }

        source.addEventListener("tick", handleTick)
        source.addEventListener("created-alert", handleAlert)
        source.addEventListener("alert-removed", handleAlertRemoved)
        source.addEventListener("alert-update", handleAlertUpdate)
        source.addEventListener("subscription-added", handleSubscriptionAdded)
        source.addEventListener("subscription-removed", handleSubscriptionRemoved)

        return () => {
            source.removeEventListener("tick", handleTick)
            source.removeEventListener("created-alert", handleAlert)
            source.removeEventListener("alert-removed", handleAlertRemoved)
            source.removeEventListener("alert-update", handleAlertUpdate)
            source.removeEventListener("subscription-added", handleSubscriptionAdded)
            source.removeEventListener("subscription-removed", handleSubscriptionRemoved)
        }
    }, [source])

    const sortableId = React.useId()
    const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))
    const dataIds = React.useMemo<UniqueIdentifier[]>(() => data.map(({ id }) => id), [data])

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (active && over && active.id !== over.id) {
            setData((prev) => {
                const oldIndex = prev.findIndex((item) => item.id === active.id)
                const newIndex = prev.findIndex((item) => item.id === over.id)
                return arrayMove(prev, oldIndex, newIndex)
            })
        }
    }

    function toggleFavoriteStock(id: string, currentlyFavorite: boolean) {
        setFavoriteStocks((prev) => {
            const next = new Set(prev)
            if (currentlyFavorite) next.delete(id)
            else next.add(id)
            return next
        })
        if (!currentlyFavorite) {
            setData((prev) => {
                const item = prev.find((d) => d.id === id)
                if (!item) return prev
                return [item, ...prev.filter((d) => d.id !== id)]
            })
        }
    }

    async function handleDeleteStock(id: string) {
        const item = data.find((d) => d.id === id)
        if (!item) return

        setData((prev) => prev.filter((d) => d.id !== id))
        setFavoriteStocks((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
        })

        try {
            const response = await fetch(
                `http://localhost:8080/api/streams/unsubscribe?symbol=${encodeURIComponent(item.symbol)}`,
                { method: "DELETE" }
            )
            if (!response.ok) throw new Error("Failed to unsubscribe")
            toast.success(`Stopped tracking ${item.symbol}.`)
        } catch (error) {
            console.error("Unsubscribe failed:", error)
            toast.error(`Failed to remove ${item.symbol}.`)
            setData((prev) => [...prev, item])
        }
    }

    async function handleClearAllStocks() {
        if (data.length === 0) return

        const toRemove = data
        setData([])
        setFavoriteStocks(new Set())

        try {
            const response = await fetch("http://localhost:8080/api/streams/unsubscribe/all", { method: "DELETE" })
            if (!response.ok) throw new Error("Failed to clear all subscriptions")
            toast.success("Cleared all tracked symbols.")
        } catch (error) {
            console.error("Clear all failed:", error)
            toast.error("Failed to clear all symbols — refresh to check.")
            setData(toRemove)
        }
    }

    function toggleFavoriteAlert(id: string, currentlyFavorite: boolean) {
        setFavoriteAlerts((prev) => {
            const next = new Set(prev)
            if (currentlyFavorite) next.delete(id)
            else next.add(id)
            return next
        })
        if (!currentlyFavorite) {
            setAlerts((prev) => {
                const item = prev.find((a) => a.id === id)
                if (!item) return prev
                return [item, ...prev.filter((a) => a.id !== id)]
            })
        }
    }

    async function handleDeleteAlert(id: string) {
        const item = alerts.find((a) => a.id === id)
        if (!item) return

        const symbol = item.symbol.toUpperCase()
        setAlerts((prev) => prev.filter((a) => a.id !== id))
        setFavoriteAlerts((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
        })

        try {
            const response = await fetch(
                `http://localhost:8080/api/streams/alerts/${encodeURIComponent(symbol)}/${encodeURIComponent(id)}`,
                { method: "DELETE" }
            )
            if (!response.ok && response.status !== 404) throw new Error("Failed to delete alert")
            if (response.ok) toast.success(`Removed alert for ${symbol}.`)
        } catch (error) {
            console.error("Delete alert failed:", error)
            toast.error(`Failed to remove alert for ${symbol}.`)
            setAlerts((prev) => [...prev, item])
        }
    }

    async function handleClearAllAlerts() {
        if (alerts.length === 0) return

        const toRemove = alerts
        setAlerts([])
        setFavoriteAlerts(new Set())

        try {
            const response = await fetch("http://localhost:8080/api/streams/alerts/all", { method: "DELETE" })
            if (!response.ok) throw new Error("Failed to clear alerts")
            toast.success("Cleared all alerts.")
        } catch (error) {
            console.error("Clear all alerts failed:", error)
            toast.error("Failed to clear alerts — refresh to check.")
            setAlerts(toRemove)
        }
    }

    async function handleClearTriggeredAlerts() {
        const previous = triggeredAlerts
        setTriggeredAlerts([])

        try {
            const response = await fetch("http://localhost:8080/api/streams/alerts/triggered", { method: "DELETE" })
            if (!response.ok) throw new Error("Failed to clear triggered alerts")
            toast.success("Cleared triggered alert history.")
        } catch (error) {
            console.error("Clear triggered alerts failed:", error)
            toast.error("Failed to clear triggered alerts — refresh to check.")
            setTriggeredAlerts(previous)
        }
    }

    return (
        <>
            <Tabs defaultValue="stocks" className="w-full flex-col justify-start gap-6 text-[#EDE6D8]">
                <div className="flex items-center justify-between px-4 lg:px-6">
                    <Label htmlFor="view-selector" className="sr-only">
                        View
                    </Label>
                    <Select
                        defaultValue="stocks"
                        items={[
                            { label: "My Stocks", value: "stocks" },
                            { label: "My Alerts", value: "alerts" },
                            { label: "Triggered Alerts", value: "triggered-alerts" },
                            { label: "Market News", value: "market-news" },
                            { label: "Company News", value: "company-news" },
                        ]}
                    >
                        <SelectTrigger
                            className="flex w-fit rounded-sm border-[#C79A4B]/20 bg-transparent text-[#EDE6D8] @4xl/main:hidden"
                            size="sm"
                            id="view-selector"
                        >
                            <SelectValue placeholder="Select a view" />
                        </SelectTrigger>
                        <SelectContent className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]">
                            <SelectGroup>
                                <SelectItem value="stocks" className="focus:bg-[#C79A4B]/10">My Stocks</SelectItem>
                                <SelectItem value="alerts" className="focus:bg-[#C79A4B]/10">My Alerts</SelectItem>
                                <SelectItem value="triggered-alerts" className="focus:bg-[#C79A4B]/10">Triggered Alerts</SelectItem>
                                <SelectItem value="market-news" className="focus:bg-[#C79A4B]/10">Market News</SelectItem>
                                <SelectItem value="company-news" className="focus:bg-[#C79A4B]/10">Company News</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <TabsList className="hidden gap-6 border-b border-[#C79A4B]/15 bg-transparent p-0 **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-[#C79A4B]/15 **:data-[slot=badge]:px-1 **:data-[slot=badge]:text-[#C79A4B] @4xl/main:flex">
                        <TabsTrigger
                            value="stocks"
                            className="rounded-none border-b-2 border-transparent px-4 pb-3 font-mono text-xs uppercase tracking-widest text-[#8B8478] data-[state=active]:border-[#C79A4B] data-[state=active]:bg-transparent data-[state=active]:text-[#C79A4B]"
                        >
                            My Stocks <Badge variant="secondary">{data.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="alerts"
                            className="rounded-none border-b-2 border-transparent px-4 pb-3 font-mono text-xs uppercase tracking-widest text-[#8B8478] data-[state=active]:border-[#C79A4B] data-[state=active]:bg-transparent data-[state=active]:text-[#C79A4B]"
                        >
                            My Alerts <Badge variant="secondary">{alerts.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="triggered-alerts"
                            className="rounded-none border-b-2 border-transparent px-4 pb-3 font-mono text-xs uppercase tracking-widest text-[#8B8478] data-[state=active]:border-[#C79A4B] data-[state=active]:bg-transparent data-[state=active]:text-[#C79A4B]"
                        >
                            Triggered <Badge variant="secondary">{triggeredAlerts.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="market-news"
                            className="rounded-none border-b-2 border-transparent px-4 pb-3 font-mono text-xs uppercase tracking-widest text-[#8B8478] data-[state=active]:border-[#C79A4B] data-[state=active]:bg-transparent data-[state=active]:text-[#C79A4B]"
                        >
                            Market News
                        </TabsTrigger>
                        <TabsTrigger
                            value="company-news"
                            className="rounded-none border-b-2 border-transparent px-4 pb-3 font-mono text-xs uppercase tracking-widest text-[#8B8478] data-[state=active]:border-[#C79A4B] data-[state=active]:bg-transparent data-[state=active]:text-[#C79A4B]"
                        >
                            Company News
                        </TabsTrigger>
                    </TabsList>
                    {/*<Button*/}
                    {/*    variant="outline"*/}
                    {/*    size="sm"*/}
                    {/*    className="rounded-sm border-[#C79A4B]/25 font-mono text-xs uppercase tracking-wide text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"*/}
                    {/*>*/}
                    {/*    /!*<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />*!/*/}
                    {/*    /!*<span className="hidden lg:inline">Add Section</span>*!/*/}
                    {/*</Button>*/}
                </div>

                <TabsContent value="stocks" className="flex flex-col gap-3 px-4 lg:px-6">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <span
                                className={`inline-block size-1.5 rounded-full ${
                                    source ? "apex-breathe bg-[#A85D45]" : "bg-[#8B8478]/30"
                                }`}
                            />
                            {data.length} {data.length === 1 ? "symbol" : "symbols"} tracked
                            {subscriptionLimit && (
                                <span className="text-[#C79A4B]">
                                    · {subscriptionLimit.count}/{subscriptionLimit.max} subscriptions
                                </span>
                            )}
                        </span>
                        <ConfirmClearAllDialog
                            count={data.length}
                            label={data.length === 1 ? "symbol" : "symbols"}
                            onConfirm={handleClearAllStocks}
                        />
                    </div>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-[#C79A4B]" />
                            Syncing active tracking streams...
                        </div>
                    ) : data.length ? (
                        <DndContext
                            collisionDetection={closestCenter}
                            modifiers={[restrictToVerticalAxis]}
                            onDragEnd={handleDragEnd}
                            sensors={sensors}
                            id={sortableId}
                        >
                            <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                                <div className="flex flex-col border-t border-[#C79A4B]/10">
                                    {data.map((item) => (
                                        <SortableStockCard
                                            key={item.id}
                                            item={item}
                                            isFavorite={favoriteStocks.has(item.id)}
                                            onToggleFavorite={toggleFavoriteStock}
                                            onDelete={handleDeleteStock}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[#C79A4B]/15 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <span>No tracked symbols yet.</span>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="alerts" className="flex flex-col gap-3 px-4 lg:px-6">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            {alerts.length} active {alerts.length === 1 ? "alert" : "alerts"}
                        </span>
                        <div className="flex items-center gap-2">
                            <CreateAlertDialog
                                triggerRender={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-sm border-[#C79A4B]/25 font-mono text-xs uppercase tracking-wide text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"
                                    />
                                }
                                triggerContent="New Alert"
                            />
                            <ConfirmClearAllDialog
                                count={alerts.length}
                                label={alerts.length === 1 ? "alert" : "alerts"}
                                onConfirm={handleClearAllAlerts}
                            />
                        </div>
                    </div>
                    {isAlertsLoading ? (
                        <div className="flex h-24 items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-[#C79A4B]" />
                            Syncing alert rules...
                        </div>
                    ) : alerts.length ? (
                        <div className="flex flex-col border-t border-[#C79A4B]/10">
                            {alerts.map((item) => {
                                const livePrice = data.find(
                                    (d) => d.symbol.toUpperCase() === item.symbol.toUpperCase()
                                )?.price
                                return (
                                    <AlertRow
                                        key={item.id}
                                        item={item}
                                        isFavorite={favoriteAlerts.has(item.id)}
                                        isActive={isAlertActive(item, livePrice)}
                                        livePrice={livePrice}
                                        onToggleFavorite={toggleFavoriteAlert}
                                        onDelete={handleDeleteAlert}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[#C79A4B]/15 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <span>No active alerts found.</span>
                            <CreateAlertDialog
                                triggerRender={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-sm border-[#C79A4B]/25 font-mono text-xs uppercase tracking-wide text-[#8B8478] hover:bg-[#C79A4B]/10 hover:text-[#C79A4B]"
                                    />
                                }
                                triggerContent="Create Alert"
                            />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="triggered-alerts" className="flex flex-col gap-3 px-4 lg:px-6">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            {triggeredAlerts.length} triggered {triggeredAlerts.length === 1 ? "event" : "events"}
                        </span>
                        <ConfirmClearAllDialog
                            count={triggeredAlerts.length}
                            label={triggeredAlerts.length === 1 ? "triggered alert" : "triggered alerts"}
                            onConfirm={handleClearTriggeredAlerts}
                        />
                    </div>
                    {triggeredAlerts.length ? (
                        <div className="flex flex-col border-t border-[#C79A4B]/10">
                            {triggeredAlerts.map((item) => (
                                <TriggeredAlertRow key={`${item.id}-${item.timestamp}`} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[#C79A4B]/15 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <span>No triggered alerts yet.</span>
                            <span className="normal-case tracking-normal">Alerts appear here in real time when price thresholds are hit.</span>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="market-news" className="flex flex-col px-4 lg:px-6">
                    {isNewsLoading ? (
                        <div className="flex h-24 items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-[#C79A4B]" />
                            Syncing headlines...
                        </div>
                    ) : marketNews.length ? (
                        <div className="flex flex-col border-t border-[#C79A4B]/10">
                            {marketNews.map((item) => (
                                <NewsRow key={item.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-24 items-center justify-center font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            No market news yet.
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="company-news" className="flex flex-col px-4 lg:px-6">
                    {isNewsLoading ? (
                        <div className="flex h-24 items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-[#C79A4B]" />
                            Syncing headlines...
                        </div>
                    ) : companyNews.length ? (
                        <div className="flex flex-col border-t border-[#C79A4B]/10">
                            {companyNews.map((item) => (
                                <NewsRow key={item.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-24 items-center justify-center font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                            No company news yet.
                        </div>
                    )}
                </TabsContent>
            </Tabs>

        </>
    )
}

function TableCellViewer({ item }: { item: StockRowData }) {
    const isMobile = useIsMobile()
    const logoSrc = `https://img.logo.dev/ticker/${item.symbol}?token=${process.env.NEXT_PUBLIC_LOGO_DEV_KEY}`
    const dominantColor = useDominantColor(logoSrc)

    return (
        <Drawer direction={isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild>
                <Button
                    variant="link"
                    className="w-fit px-0 text-left font-mono font-semibold text-[#EDE6D8] hover:text-[#C79A4B]"
                >
                    {item.symbol}
                </Button>
            </DrawerTrigger>
            <DrawerContent className="border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]">
                <DrawerHeader className="gap-1 border-b border-[#C79A4B]/10">
                    <DrawerTitle className="font-mono uppercase tracking-widest text-[#C79A4B]">{item.symbol}</DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                    {!isMobile && (
                        <div
                            className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-sm border border-[#C79A4B]/10 transition-colors duration-500"
                            style={{ backgroundColor: dominantColor ?? "#0C0B09" }}
                        >
                            <img
                                src={logoSrc}
                                alt={`${item.symbol} logo`}
                                className="h-28 w-28 object-contain drop-shadow-md"
                                onError={(e) => { e.currentTarget.src = "/fallback-logo.png" }}
                            />
                        </div>
                    )}
                    <form className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="symbol" className="font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                                Ticker Symbol
                            </Label>
                            <Input
                                id="symbol"
                                value={item.symbol}
                                readOnly
                                className="rounded-sm border-[#C79A4B]/20 bg-transparent font-mono text-[#EDE6D8]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="price" className="font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                                    Current Price
                                </Label>
                                <Input
                                    id="price"
                                    value={item.price}
                                    readOnly
                                    className="rounded-sm border-[#C79A4B]/20 bg-transparent font-mono text-[#EDE6D8]"
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="size" className="font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                                    Execution Size
                                </Label>
                                <Input
                                    id="size"
                                    value={item.size}
                                    readOnly
                                    className="rounded-sm border-[#C79A4B]/20 bg-transparent font-mono text-[#EDE6D8]"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="timestamp" className="font-mono text-xs uppercase tracking-wider text-[#8B8478]">
                                Transaction Time
                            </Label>
                            <Input
                                id="timestamp"
                                value={formatTimestamp(item.timestamp)}
                                readOnly
                                className="rounded-sm border-[#C79A4B]/20 bg-transparent font-mono text-[#EDE6D8]"
                            />
                        </div>
                    </form>
                </div>
                <DrawerFooter className="border-t border-[#C79A4B]/10">
                    <DrawerClose asChild>
                        <Button className="rounded-sm bg-[#C79A4B] text-[#0C0B09] hover:bg-[#C79A4B]/90">Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}