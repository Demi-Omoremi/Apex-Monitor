package com.apex.monitor.model;

import java.time.Instant;

public record TriggeredAlert(
        String id,
        String symbol,
        double targetPrice,
        double triggeredPrice,
        String condition,
        Instant timestamp
) {}
