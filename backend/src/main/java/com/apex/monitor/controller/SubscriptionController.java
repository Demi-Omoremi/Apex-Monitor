package com.apex.monitor.controller;

import com.apex.monitor.model.MarketTick;
import com.apex.monitor.registry.TickerTracker;
import com.apex.monitor.service.IngestionService;
import com.apex.monitor.service.SseService;
import com.apex.monitor.service.SubscribeResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/subscription/limit")
    public ResponseEntity<Map<String, Integer>> getSubscriptionLimit() {
        return ResponseEntity.ok(Map.of(
                "count", tickerTracker.getSubscriptionCount(),
                "max", tickerTracker.getMaxSubscriptions()
        ));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, Object>> subscribeToStock(@RequestParam String symbol) {
        SubscribeResult result = ingestionService.subscribeToStock(symbol);
        return toSubscribeResponse(result, symbol, tickerTracker.getSubscriptionCount());
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribeToStock(@RequestParam String symbol) {
        String clean = symbol.toUpperCase().trim();
        if (!ingestionService.unsubscribeFromStock(symbol)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "FAILED",
                    "message", "Failed to unsubscribe from symbol: " + clean
            ));
        }

        sseService.broadcast("subscription-removed", Map.of("symbol", clean));
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Unsubscribed from " + clean
        ));
    }

    @GetMapping(value = "/subscribe-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTicks() {
        return sseService.createConnection();
    }

    static ResponseEntity<Map<String, Object>> toSubscribeResponse(SubscribeResult result, String symbol, int count) {
        String clean = symbol.toUpperCase().trim();
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("status", result.outcome().name());
        body.put("message", result.message());
        body.put("count", count);
        body.put("max", TickerTracker.MAX_SUBSCRIPTIONS);

        if (result.outcome() == SubscribeResult.Outcome.LIMIT_REACHED) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }
        if (!result.succeeded()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
        }

        body.put("symbol", clean);
        return ResponseEntity.ok(body);
    }
}
