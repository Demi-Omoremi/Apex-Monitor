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
    id?: number
    symbol: string
    price: number
    size?: number
    timestamp?: string
    conditions?: string[]
    percentageChange: number
    volumeDescription?: string
}

export interface News {
    id: number
    author: string
    headline: string,
    summary: string,
    source: string
    symbols: string[]
    created_at: string
    updated_at: string
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

export const newsSchema = z.object({
    id: z.number(),
    author: z.string(),
    headline: z.string(),
    summary: z.string(),
    source: z.string(),
    symbols: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
})

export type NewsItem = z.infer<typeof newsSchema>

export const alertRuleSchema = z.object({
    id: z.coerce.string(),
    symbol: z.string(),
    targetPrice: z.number(),
    condition: z.enum(["ABOVE", "BELOW", "ABOVE_OR_EQUAL", "BELOW_OR_EQUAL"]).catch("ABOVE"), // Adjust based on your exact Java enum/string values
})

export type AlertRule = z.infer<typeof alertRuleSchema>

export const triggeredAlertSchema = z.object({
    id: z.coerce.string(),
    symbol: z.string(),
    targetPrice: z.number(),
    triggeredPrice: z.number(),
    condition: z.enum(["ABOVE", "BELOW", "ABOVE_OR_EQUAL", "BELOW_OR_EQUAL"]).catch("ABOVE"),
    timestamp: z.union([
        z.string(),
        z.number(),
        z.object({
            epochSecond: z.number(),
            nano: z.number().optional(),
        }),
    ]).transform((value) => {
        if (typeof value === "number") {
            return new Date(value).toISOString()
        }
        if (typeof value === "string") {
            return value
        }
        return new Date(value.epochSecond * 1000 + (value.nano ?? 0) / 1_000_000).toISOString()
    }),
})

export type TriggeredAlert = z.infer<typeof triggeredAlertSchema>