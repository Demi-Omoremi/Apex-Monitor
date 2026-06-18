package com.apex.monitor.model;

import java.time.Instant;

public record MarketBar(
        String symbol,
        Double price,
        Instant timestamp
) {

}
