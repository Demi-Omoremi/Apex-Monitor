package com.apex.monitor.controller;


import com.apex.monitor.dto.AlertRequest;
import com.apex.monitor.model.AlertRule;
import com.apex.monitor.model.AlertRuleEntity;
import com.apex.monitor.registry.AlertRegistry;
import com.apex.monitor.repository.AlertRuleRepository;
import com.apex.monitor.service.SseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertRegistry alertRegistry;
    private final AlertRuleRepository alertRuleRepository;
    private final SseService sseService;

    public AlertController(AlertRegistry alertRegistry, AlertRuleRepository alertRuleRepository,
                           SseService service) {
        this.alertRegistry = alertRegistry;
        this.alertRuleRepository = alertRuleRepository;
        this.sseService = service;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> createAlert(@Valid @RequestBody AlertRequest alertRequest) {

        AlertRuleEntity entity = new AlertRuleEntity(null, alertRequest.getSymbol(), alertRequest.getTargetPrice(),
                alertRequest.getCondition());
        AlertRuleEntity saved = alertRuleRepository.save(entity);

        AlertRule rule = new AlertRule(String.valueOf(saved.getId()),
                alertRequest.getSymbol(), alertRequest.getTargetPrice(), alertRequest.getCondition());

        alertRegistry.addAlert(rule);



        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "SUCCESS",
                "message", "Dynamic alert criteria successfully locked for symbol: " + rule.symbol()
        ));
    }


//    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
//    public SseEmitter streamSubscribedAlerts() {
//        return sseService.createConnection("alerts");
//    }


}
