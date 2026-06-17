interface MarketTickResponse {
    S: string;
    p: number;
    s: number;
    t: string;
    c: string[];
    percentageChange: number;
}

interface StockItem {
    id: number;
    symbol: string;
    price: number;
    percentageChange: number;
    volumeDescription?: string;
}