package com.apex.monitor.service;

import com.apex.monitor.model.MarketTick;

public record SubscribeResult(Outcome outcome, MarketTick tick, String message) {

    public enum Outcome {
        SUBSCRIBED,
        ALREADY_SUBSCRIBED,
        LIMIT_REACHED,
        FAILED
    }

    public boolean succeeded() {
        return outcome == Outcome.SUBSCRIBED || outcome == Outcome.ALREADY_SUBSCRIBED;
    }

    public static SubscribeResult subscribed(MarketTick tick) {
        return new SubscribeResult(Outcome.SUBSCRIBED, tick, "Subscribed to " + tick.symbol());
    }

    public static SubscribeResult alreadySubscribed(MarketTick tick) {
        return new SubscribeResult(Outcome.ALREADY_SUBSCRIBED, tick, "Already streaming " + tick.symbol());
    }

    public static SubscribeResult limitReached(int max) {
        return new SubscribeResult(
                Outcome.LIMIT_REACHED,
                null,
                "Subscription limit of " + max + " reached. Remove a symbol before adding another."
        );
    }

    public static SubscribeResult failed(String symbol, String reason) {
        return new SubscribeResult(
                Outcome.FAILED,
                null,
                "Failed to subscribe to " + symbol + ": " + reason
        );
    }
}
