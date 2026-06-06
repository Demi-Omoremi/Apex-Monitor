

export interface MarketTick {
    symbol: string;
    price: number;
    size: number;
    timestamp?: string;
}

export interface TriggeredAlert {
    id: string;
    symbol: string;
    targetPrice: number;
    triggeredPrice: number;
    condition: 'ABOVE' | 'BELOW';
    timestamp?: string;
}

