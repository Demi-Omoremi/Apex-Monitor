package com.apex.monitor.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public record MarketBar(
        @JsonProperty("symbol") String symbol,
        @JsonAlias("c") double close,
        @JsonAlias("h") double high,
        @JsonAlias("l") double low,
        @JsonAlias("n") int tradeCount,
        @JsonAlias("o") double open,
        @JsonAlias("t") Instant timestamp,
        @JsonAlias("v") long volume,
        @JsonAlias("vw") double vwap
) {

}
