package com.apex.monitor.dto;


import com.apex.monitor.registry.TickerTracker;


public record StockItem(
        String symbol,
        Double price,
        Double percentageChange
) {


}
