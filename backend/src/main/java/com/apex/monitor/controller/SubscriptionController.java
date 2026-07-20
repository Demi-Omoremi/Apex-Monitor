package com.apex.monitor.controller;

import com.apex.monitor.model.MarketTick;
import com.apex.monitor.registry.TickerTracker;
import com.apex.monitor.service.IngestionService;
import com.apex.monitor.service.SseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/streams")
public class SubscriptionController {

    private final TickerTracker tickerTracker;
    private final SseService sseService;
    private final IngestionService ingestionService;

    public SubscriptionController(TickerTracker tickerTracker, SseService sseService, IngestionService ingestionService) {
        this.tickerTracker = tickerTracker;
        this.sseService = sseService;
        this.ingestionService = ingestionService;
    }


    @GetMapping(value = "/subscription/popular", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<MarketTick>> getPopularSnapshot() {
        List<MarketTick> popularList = tickerTracker.getPopularList();
        return ResponseEntity.ok(popularList);
    }

    @GetMapping("/subscription")
    public ResponseEntity<List<MarketTick>> getSubscriptionSnapshot() {
        List<MarketTick> subscriptions = tickerTracker.getSubscriptions();
        return ResponseEntity.ok(subscriptions);
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribeToStock(@RequestParam String symbol) {
        if (!ingestionService.subscribeToStock(symbol)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed to subscribe to symbol: " + symbol);
        }

        return ResponseEntity.ok("Subscribed to " + symbol);
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribeToStock(@RequestParam String symbol) {
        if (!ingestionService.subscribeToStock(symbol)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed to subscribe to symbol: " + symbol);
        }

        return ResponseEntity.ok("Unsubscribed from " + symbol);
    }








}
