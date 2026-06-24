package com.apex.monitor.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketTick(
        @JsonAlias("S") String symbol, //
        @JsonAlias("p") double price,
        @JsonAlias("s") Long size,
        @JsonAlias("t") Instant timestamp,
        @JsonAlias("c") List<String> conditions,
        Double percentageChange
) {

    public MarketTick {
        if (size == null) {
            size = 0L; // Default size to 0 instead of null
        }
        if (conditions == null) {
            conditions = Collections.emptyList(); // Default to empty list to avoid NPEs
        }
        if (percentageChange == null) {
            percentageChange = 0.0;
        }
    }

    public MarketTick(String symbol, double price, long size, Instant timestamp, List<String> conditions) {
        this(symbol, price, size, timestamp, conditions, 0.0);
    }

    // Factory method that computes percentageChange using a known prev closing price
    public static MarketTick withPercentageChange(MarketTick tick, double closingPrice) {
        double pctChange = closingPrice == 0 ? 0.0 : ((tick.price() - closingPrice) / closingPrice) * 100;
        return new MarketTick(tick.symbol(), tick.price(), tick.size(), tick.timestamp(), tick.conditions(), pctChange);
    }
//
    public MarketTick(MarketBar marketBar) {
        this(marketBar.symbol(), marketBar.close(), null, marketBar.timestamp(), null, 0.0);
    }
}
