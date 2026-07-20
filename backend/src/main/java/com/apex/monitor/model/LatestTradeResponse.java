package com.apex.monitor.model;

import java.time.Instant;
import java.util.List;

public record LatestTradeResponse(
        String symbol,
        List<Trade> trades
) {
    public record Trade(
            double p,
            Long s,
            Instant t,
            List<String> c,
            String x,
            Long i,
            String z
    ) {}

    public MarketTick toMarketTick(Double percentageChange) {
        Trade trade = trades.getFirst();
        return new MarketTick(symbol, trade.p(), trade.s(), trade.t(), trade.c(), percentageChange);
    }
}