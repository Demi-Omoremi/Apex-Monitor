package com.apex.monitor.registry;

import com.apex.monitor.model.MarketTick;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TickerTracker {
    private final Map<String, MarketTick> popularTickers = new ConcurrentHashMap<>();
    private final Map<String, MarketTick> subscribedTickers = new ConcurrentHashMap<>();
//    private final Map<String, MarketTick> popularTickers = new ConcurrentHashMap<>();

    public void populate(MarketTick tick) {
        populateSubscription(tick);
        populatePopular(tick);
    }

    public void populatePopular(MarketTick tick) {
        if (popularTickers.containsKey(tick.symbol())) {
            popularTickers.put(tick.symbol(), tick);
        };
    }

    public Map<String, MarketTick> getPopularTickers() {
        return popularTickers;
    }

    public void populateSubscription(MarketTick tick) {
        subscribedTickers.put(tick.symbol(), tick);

    }

    public Map<String, MarketTick> getSubscribedTickers() {
        return subscribedTickers;
    }

    public void initializePopular(List<String> list) {
        for (String symbol: list) {
            popularTickers.put(symbol, null);
        }
    }

}
