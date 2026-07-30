package com.apex.monitor.controller;

import com.apex.monitor.dto.AlertRequest;
import com.apex.monitor.model.AlertRule;
import com.apex.monitor.model.AlertRuleEntity;
import com.apex.monitor.model.MarketTick;
import com.apex.monitor.model.TriggeredAlert;
import com.apex.monitor.registry.AlertRegistry;
import com.apex.monitor.registry.TickerTracker;
import com.apex.monitor.registry.TriggeredAlertStore;
import com.apex.monitor.repository.AlertRuleRepository;
import com.apex.monitor.service.IngestionService;
import com.apex.monitor.service.MarketConsumerService;
import com.apex.monitor.service.SseService;
import com.apex.monitor.service.SubscribeResult;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/streams/alerts")
public class AlertController {

    private final AlertRegistry alertRegistry;
    private final AlertRuleRepository alertRuleRepository;
    private final TriggeredAlertStore triggeredAlertStore;
    private final TickerTracker tickerTracker;
    private final SseService sseService;
    private final MarketConsumerService marketConsumerService;
    private final IngestionService ingestionService;

    public AlertController(AlertRegistry alertRegistry, AlertRuleRepository alertRuleRepository,
                           TriggeredAlertStore triggeredAlertStore, TickerTracker tickerTracker, SseService service,
                           MarketConsumerService marketConsumerService, IngestionService ingestionService) {
        this.alertRegistry = alertRegistry;
        this.alertRuleRepository = alertRuleRepository;
        this.triggeredAlertStore = triggeredAlertStore;
        this.tickerTracker = tickerTracker;
        this.sseService = service;
        this.marketConsumerService = marketConsumerService;
        this.ingestionService = ingestionService;
    }

    @PostMapping("/create-alert")
    public ResponseEntity<Map<String, Object>> createAlert(@Valid @RequestBody AlertRequest alertRequest) {
        String cleanSymbol = alertRequest.getSymbol().toUpperCase().trim();
        String condition = alertRequest.getCondition().toUpperCase().trim();

        if (!tickerTracker.hasSubscriptionCapacity(cleanSymbol)) {
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("status", SubscribeResult.Outcome.LIMIT_REACHED.name());
            body.put("message", "Subscription limit of " + TickerTracker.MAX_SUBSCRIPTIONS
                    + " reached. Remove a tracked symbol before creating an alert for a new one.");
            body.put("count", tickerTracker.getSubscriptionCount());
            body.put("max", TickerTracker.MAX_SUBSCRIPTIONS);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }

        AlertRuleEntity entity = new AlertRuleEntity(null, cleanSymbol, alertRequest.getTargetPrice(), condition);
        AlertRuleEntity saved = alertRuleRepository.save(entity);

        AlertRule rule = new AlertRule(String.valueOf(saved.getId()), cleanSymbol, alertRequest.getTargetPrice(), condition);

        alertRegistry.addAlert(rule);

        SubscribeResult subscribeResult = ingestionService.subscribeToStock(cleanSymbol);
        if (subscribeResult.outcome() == SubscribeResult.Outcome.LIMIT_REACHED) {
            alertRegistry.deleteAlert(rule.id(), cleanSymbol);
            deletePersistedAlert(rule.id());
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("status", subscribeResult.outcome().name());
            body.put("message", subscribeResult.message());
            body.put("count", tickerTracker.getSubscriptionCount());
            body.put("max", TickerTracker.MAX_SUBSCRIPTIONS);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }

        sseService.broadcast("created-alert", rule);
        for (MarketTick tick: tickerTracker.getSubscriptions()) {
            marketConsumerService.checkTrigger(tick);
        }


        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("status", "SUCCESS");
        body.put("message", "Dynamic alert criteria successfully locked for symbol: " + rule.symbol());
        body.put("subscribed", subscribeResult.outcome() == SubscribeResult.Outcome.SUBSCRIBED);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @DeleteMapping("/{symbol}/{id}")
    public ResponseEntity<Map<String, String>> removeAlert(@PathVariable String symbol, @PathVariable String id) {
        AlertRule removed = alertRegistry.deleteAlert(id, symbol);
        if (removed == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "NOT_FOUND",
                    "message", "Alert not found: " + id
            ));
        }

        deletePersistedAlert(removed.id());
        marketConsumerService.removeRuleFromCoolDown(removed.id());
        sseService.broadcast("alert-removed", Map.of("id", removed.id()));

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Successfully deleted alert for " + removed.symbol()
        ));
    }

    @DeleteMapping("/symbol/{symbol}")
    public ResponseEntity<Map<String, String>> removeAlertsForSymbol(@PathVariable String symbol) {
        String clean = symbol.toUpperCase().trim();
        List<AlertRule> removed = alertRegistry.deleteAlerts(clean);

        if (removed.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "NOT_FOUND",
                    "message", "No alerts found for: " + clean
            ));
        }

        for (AlertRule rule : removed) {
            deletePersistedAlert(rule.id());
            marketConsumerService.removeRuleFromCoolDown(rule.id());
            sseService.broadcast("alert-removed", Map.of("id", rule.id()));
        }

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Successfully deleted alerts associated with " + clean
        ));
    }

    @DeleteMapping("/all")
    public ResponseEntity<Map<String, String>> removeAllAlerts() {
        List<AlertRule> removed = alertRegistry.clearAll();

        if (removed.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "message", "No alerts to delete"
            ));
        }

        alertRuleRepository.deleteAll();
        for (AlertRule rule : removed) {
            marketConsumerService.removeRuleFromCoolDown(rule.id());
            sseService.broadcast("alert-removed", Map.of("id", rule.id()));
        }

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Successfully deleted all alerts"
        ));
    }

    private void deletePersistedAlert(String id) {
        try {
            alertRuleRepository.deleteById(Long.parseLong(id));
        } catch (NumberFormatException ignored) {
            // not a numeric id, nothing to delete
        } catch (org.springframework.dao.EmptyResultDataAccessException ignored) {
            // already deleted (e.g. by a concurrent clear-all) — desired end state reached, not an error
        }
    }

    @GetMapping("/triggered")
    public ResponseEntity<List<TriggeredAlert>> getTriggeredAlerts() {
        return ResponseEntity.ok(triggeredAlertStore.getAll());
    }

    @DeleteMapping("/triggered")
    public ResponseEntity<Map<String, String>> clearTriggeredAlerts() {
        triggeredAlertStore.clear();
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Cleared triggered alert history"
        ));
    }

    @GetMapping("/{symbol}")
    public ResponseEntity<List<AlertRule>> getAlertsForSymbol(@PathVariable String symbol) {
        List<AlertRule> alerts = alertRegistry.getAlertRules(symbol);
        return ResponseEntity.ok(alerts == null ? List.of() : alerts);
    }

    @GetMapping
    public ResponseEntity<List<AlertRule>> getAllAlerts() {
        return ResponseEntity.ok(alertRegistry.getAllAlerts());
    }
}
