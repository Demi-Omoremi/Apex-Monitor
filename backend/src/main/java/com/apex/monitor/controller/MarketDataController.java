package com.apex.monitor.controller;


import com.apex.monitor.dto.StockItem;
import com.apex.monitor.service.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/streams/stocks")
public class MarketDataController {

    private final MarketDataService marketDataService;

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/most-active")
    public ResponseEntity<List<StockItem>> getMostActiveSnapShot() {
        return ResponseEntity.ok(marketDataService.getMostActive());
    }

    @GetMapping("/gainers")
    public ResponseEntity<List<StockItem>> getStockGainersSnapShot() {
        return ResponseEntity.ok(marketDataService.getStockGainers());
    }

    @GetMapping("/losers")
    public ResponseEntity<List<StockItem>> getStockLosersSnapShot() {
        return ResponseEntity.ok(marketDataService.getStockLosers());
    }

    @GetMapping("/highest-volume")
    public ResponseEntity<List<StockItem>> getHighestVolumeStockSnapShot() {
        return ResponseEntity.ok(marketDataService.getHighestVolumeStock());
    }

}
