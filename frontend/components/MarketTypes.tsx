import { z } from "zod"


export interface MarketTick {
    symbol: string
    price: number
    size: number
    timestamp: string
    conditions?: string[]
    percentageChange: number
}

export interface MarketBar {
    symbol: string
    close: number
    high: number
    low: number
    tradeCount: number
    open: number
    timestamp: string
    volume: number
    vmap: number
}

export interface StockItem {
    id: number
    symbol: string
    price: number
    size?: number
    timestamp?: string
    conditions?: string[]
    percentageChange: number
    volumeDescription?: string
}

export const schema = z.object({
    symbol: z.string(),
    price: z.number(),
    size: z.number(),
    timestamp: z.string(),
    percentageChange: z.number()
}).transform((incoming) => ({
    id: incoming.symbol,
    symbol: incoming.symbol,
    price: incoming.price,
    size: incoming.size,
    timestamp: incoming.timestamp,
    percentageChange: incoming.percentageChange,
}))

export type StockRowData = z.infer<typeof schema>


