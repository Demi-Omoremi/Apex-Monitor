package com.apex.monitor.registry;


import com.apex.monitor.model.AlertRule;
import com.apex.monitor.model.AlertRuleEntity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class AlertRegistry {
    private final Map<String, List<AlertRule>> alertRuleMap = new ConcurrentHashMap<>();

    public void addAlert(AlertRule alertRule) {
        alertRuleMap.computeIfAbsent(alertRule.symbol().toUpperCase(), k -> new CopyOnWriteArrayList<>()).add(alertRule);
    }

    public void addAlert(AlertRuleEntity entity) {
        String cleanSymbol = entity.getSymbol().toUpperCase().trim();
        AlertRule rule = new AlertRule(cleanSymbol, entity.getSymbol(), entity.getTargetPrice(), entity.getCondition());
        alertRuleMap.computeIfAbsent(cleanSymbol, k -> new CopyOnWriteArrayList<>()).add(rule);
    }

    public void addAlert(String symbol, double targetPrice, String condition) {
        String cleanSymbol = symbol.toUpperCase();
        AlertRule newRule = new AlertRule(UUID.randomUUID().toString(), cleanSymbol, targetPrice, condition);
        alertRuleMap.computeIfAbsent(cleanSymbol, k -> new CopyOnWriteArrayList<>()).add(newRule);
    }

    public Map<String, List<AlertRule>> getAlertRuleMap() {
        return alertRuleMap;
    }

    public List<AlertRule> getAlertRules(String Symbol) {
        return alertRuleMap.get(Symbol.toUpperCase().trim());
    }
}
