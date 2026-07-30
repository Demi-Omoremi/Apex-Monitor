package com.apex.monitor.model;

public record AlertRule(
        String id,
        String symbol,
        double targetPrice,
        String condition
) {}


