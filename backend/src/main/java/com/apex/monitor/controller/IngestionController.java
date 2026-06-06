package com.apex.monitor.controller;


import com.apex.monitor.dto.StockRequest;
import com.apex.monitor.service.IngestionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/streams")
public class IngestionController {

    private final IngestionService ingestionService;

    public IngestionController(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, String>> subscribeToStock(@Valid @RequestBody StockRequest stockRequest) {

        ingestionService.subscribeToStock(stockRequest.getSymbol());

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Ingestion pipeline successfully expanded to track: " + stockRequest.getSymbol() + "."
        ));
    }




}
