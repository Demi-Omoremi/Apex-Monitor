package com.apex.monitor.model;

import java.time.Instant;

public record TriggeredAlert(
        String id,
        String symbol,
        double targetPrice,
        double triggeredPrice,
        String condition,
        long timestamp
) {
    public static TriggeredAlert fromRule(AlertRule rule, double currentPrice, Instant now) {
        return new TriggeredAlert(
                rule.id(),
                rule.symbol().toUpperCase().trim(),
                rule.targetPrice(),
                currentPrice,
                rule.condition(),
                now.toEpochMilli()
        );
    }
}
