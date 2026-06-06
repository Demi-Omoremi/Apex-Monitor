package com.apex.monitor.controller;


import com.apex.monitor.dto.AlertRequest;
import com.apex.monitor.model.AlertRule;
import com.apex.monitor.model.AlertRuleEntity;
import com.apex.monitor.registry.AlertRegistry;
import com.apex.monitor.repository.AlertRuleRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertRegistry alertRegistry;
    private final AlertRuleRepository alertRuleRepository;

    public AlertController(AlertRegistry alertRegistry, AlertRuleRepository alertRuleRepository) {
        this.alertRegistry = alertRegistry;
        this.alertRuleRepository = alertRuleRepository;
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
}
