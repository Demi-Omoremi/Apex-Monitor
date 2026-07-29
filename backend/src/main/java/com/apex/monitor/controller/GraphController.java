package com.apex.monitor.controller;


import com.apex.monitor.enums.Timeframe;
import com.apex.monitor.model.HistoricalBarsResponse;
import com.apex.monitor.model.MarketBar;
import com.apex.monitor.service.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/streams")
@CrossOrigin("*")
public class GraphController {

    private final MarketDataService marketDataService;


    public GraphController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }


    @GetMapping("/{symbol}/historical-bars")
    public ResponseEntity<HistoricalBarsResponse> getMarketData(@PathVariable String symbol, @RequestParam Timeframe tf) {
        HistoricalBarsResponse response = marketDataService.getHistoricalMarketData(symbol, tf);
        return ResponseEntity.ok(response);
    }
}
