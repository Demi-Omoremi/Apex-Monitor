package com.apex.monitor.controller;


import com.apex.monitor.dto.StockRequest;
import com.apex.monitor.model.MarketTick;
import com.apex.monitor.registry.TickerTracker;
import com.apex.monitor.service.IngestionService;
import com.apex.monitor.service.SseService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/streams")
public class IngestionController {

    private final IngestionService ingestionService;
    private final TickerTracker tickerTracker;
    private final SseService sseService;

    public IngestionController(IngestionService ingestionService, TickerTracker tickerTracker,
                               SseService sseService) {
        this.ingestionService = ingestionService;
        this.tickerTracker = tickerTracker;
        this.sseService = sseService;
    }

//    @PostMapping("/subscribe")
//    public ResponseEntity<Map<String, String>> subscribeToStock(@Valid @RequestBody StockRequest stockRequest) {
//
//        ingestionService.subscribeToStock(stockRequest.getSymbol());
//
//        return ResponseEntity.ok(Map.of(
//                "status", "SUCCESS",
//                "message", "Ingestion pipeline successfully expanded to track: " + stockRequest.getSymbol() + "."
//        ));
//    }

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter dashboardStream() {
        return sseService.createConnection();
    }






}
