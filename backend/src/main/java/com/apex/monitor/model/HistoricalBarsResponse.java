package com.apex.monitor.model;

import java.util.List;

public record HistoricalBarsResponse(
        List<MarketBar> bars,
        Double previousClose
) {}