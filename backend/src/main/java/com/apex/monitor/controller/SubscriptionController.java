package com.apex.monitor.controller;

import com.apex.monitor.model.MarketTick;
import com.apex.monitor.registry.TickerTracker;
import com.apex.monitor.service.SseService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/streams")
public class SubscriptionController {

    private final TickerTracker tickerTracker;
    private final SseService sseService;

    public SubscriptionController(TickerTracker tickerTracker, SseService sseService) {
        this.tickerTracker = tickerTracker;
        this.sseService = sseService;
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






}
