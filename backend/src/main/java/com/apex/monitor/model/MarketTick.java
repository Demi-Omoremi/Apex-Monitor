package com.apex.monitor.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketTick(
        @JsonProperty("S") String symbol, //
        @JsonProperty("p") double price,
        @JsonProperty("s") long size,
        @JsonProperty("t") Instant timestamp,
        @JsonProperty("c") List<String> conditions,
        @JsonProperty("percentageChange") Double percentageChange
) {

    public MarketTick(String symbol, double price, long size, Instant timestamp, List<String> conditions) {
        this(symbol, price, size, timestamp, conditions, 0.0);
    }

    // Factory method that computes percentageChange using a known open price
    public static MarketTick withPercentageChange(MarketTick tick, double openPrice) {
        double pctChange = openPrice == 0 ? 0.0 : ((tick.price() - openPrice) / openPrice) * 100;
        return new MarketTick(tick.symbol(), tick.price(), tick.size(), tick.timestamp(), tick.conditions(), pctChange);
    }
}
