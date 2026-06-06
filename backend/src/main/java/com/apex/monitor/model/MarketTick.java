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
        @JsonProperty("c") List<String> conditions
) { }
