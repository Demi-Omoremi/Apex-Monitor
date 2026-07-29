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
        String cleanSymbol = alertRule.symbol().toUpperCase().trim();
        alertRuleMap.computeIfAbsent(cleanSymbol, k -> new CopyOnWriteArrayList<>()).add(alertRule);
    }

    public void addAlert(AlertRuleEntity entity) {
        String cleanSymbol = entity.getSymbol().toUpperCase().trim();
        AlertRule rule = new AlertRule(String.valueOf(entity.getId()), cleanSymbol, entity.getTargetPrice(), entity.getCondition());
        alertRuleMap.computeIfAbsent(cleanSymbol, k -> new CopyOnWriteArrayList<>()).add(rule);
    }

    public void addAlert(String symbol, double targetPrice, String condition) {
        String cleanSymbol = symbol.toUpperCase().trim();
        AlertRule newRule = new AlertRule(UUID.randomUUID().toString(), cleanSymbol, targetPrice, condition);
        alertRuleMap.computeIfAbsent(cleanSymbol, k -> new CopyOnWriteArrayList<>()).add(newRule);
    }

    public Map<String, List<AlertRule>> getAlertRuleMap() {
        return alertRuleMap;
    }

    public List<AlertRule> getAllAlerts() {
        return alertRuleMap.values().stream().flatMap(List::stream).toList();
    }

    public List<AlertRule> getAlertRules(String symbol) {
        return alertRuleMap.get(symbol.toUpperCase().trim());
    }

    public AlertRule deleteAlert(String id, String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();
        List<AlertRule> alerts = alertRuleMap.get(cleanSymbol);
        if (alerts == null) {
            return deleteAlertById(id);
        }

        for (int i = 0; i < alerts.size(); i++) {
            AlertRule check = alerts.get(i);

            if (check.id().equalsIgnoreCase(id)) {
                alerts.remove(i);
                if (alerts.isEmpty()) {
                    alertRuleMap.remove(cleanSymbol);
                }
                return check;
            }
        }

        return deleteAlertById(id);
    }

    public AlertRule deleteAlertById(String id) {
        for (Map.Entry<String, List<AlertRule>> entry : alertRuleMap.entrySet()) {
            List<AlertRule> alerts = entry.getValue();
            for (int i = 0; i < alerts.size(); i++) {
                AlertRule check = alerts.get(i);
                if (check.id().equalsIgnoreCase(id)) {
                    alerts.remove(i);
                    if (alerts.isEmpty()) {
                        alertRuleMap.remove(entry.getKey());
                    }
                    return check;
                }
            }
        }
        return null;
    }

    public List<AlertRule> deleteAlerts(String symbol) {
        List<AlertRule> removed = alertRuleMap.remove(symbol.toUpperCase().trim());
        return removed == null ? List.of() : removed;
    }

    public List<AlertRule> clearAll() {
        List<AlertRule> all = getAllAlerts();
        alertRuleMap.clear();
        return all;
    }


}
