package com.apex.monitor.service;


import com.apex.monitor.model.AlertRule;
import com.apex.monitor.model.MarketTick;
import com.apex.monitor.model.MarketTickEntity;
import com.apex.monitor.model.TriggeredAlert;
import com.apex.monitor.registry.AlertRegistry;
import com.apex.monitor.registry.TickerTracker;
import com.apex.monitor.registry.TriggeredAlertStore;
import com.apex.monitor.repository.MarketTickRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MarketConsumerService {


    private final MarketTickRepository marketTickRepository;
    private final AlertRegistry alertRegistry;
    private final TriggeredAlertStore triggeredAlertStore;
    private final Map<String, Instant> alertCooldownMap = new ConcurrentHashMap<>();
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final SseService service;
    private final TickerTracker tickerTracker;

    private static final long COOLDOWN_SECONDS = 5;

    public MarketConsumerService(MarketTickRepository marketTickRepository, AlertRegistry alertRegistry,
                                 TriggeredAlertStore triggeredAlertStore,
                                 KafkaTemplate<String, Object> kafkaTemplate, SseService service, TickerTracker tickerTracker) {
        this.marketTickRepository = marketTickRepository;
        this.alertRegistry = alertRegistry;
        this.triggeredAlertStore = triggeredAlertStore;
        this.kafkaTemplate = kafkaTemplate;
        this.service = service;
        this.tickerTracker = tickerTracker;

    }

    @KafkaListener(topics = "market-ticks", groupId = "apex-monitor-group")
    public void consumeMarketTicks(MarketTick marketTick) {
        try {

            MarketTick enriched = MarketTick.withPercentageChange(marketTick, tickerTracker.getClosingPrice(marketTick.symbol().toUpperCase().trim()));

            MarketTickEntity entity = new MarketTickEntity();
            entity.setSymbol(enriched.symbol());
            entity.setPrice(enriched.price());
            entity.setSize(enriched.size());
            entity.setTimestamp(marketTick.timestamp() != null ? marketTick.timestamp() : Instant.now());
            entity.setPercentageChange(enriched.percentageChange());

            checkTrigger(marketTick);
            tickerTracker.updateSubscriptions(enriched);
            marketTickRepository.save(entity);

            


            service.broadcast("tick", enriched);



        } catch (Exception e) {
            System.err.println("Error processing consumed Kafka message: " + e.getMessage());
        }

    }



    public void checkTrigger(MarketTick marketTick) {
        String cleanSymbol = marketTick.symbol().toUpperCase().trim();
        double currentPrice = marketTick.price();
        List<AlertRule> ruleList = alertRegistry.getAlertRules(cleanSymbol);

        if (ruleList == null || ruleList.isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        // copy to avoid mutating the list you're iterating over
        for (AlertRule rule : new ArrayList<>(ruleList)) {
            if (!isConditionMet(rule, currentPrice)) {
                continue;
            }

            TriggeredAlert triggeredAlert = TriggeredAlert.fromRule(rule, currentPrice, now);

            triggeredAlertStore.add(triggeredAlert);
            kafkaTemplate.send("triggered-alerts", rule.id(), triggeredAlert);
            service.broadcast("alert-update", triggeredAlert);

            // rule has done its job — remove it so it can't fire again
            alertRegistry.deleteAlert(cleanSymbol, rule.id());
            alertCooldownMap.remove(rule.id());
            service.broadcast("alert-removed", Map.of("id", rule.id()));

            System.out.printf("➔ [Engine] Triggered alert for %s at $%.2f (target %s $%.2f)%n",
                    cleanSymbol, currentPrice, rule.condition(), rule.targetPrice());
        }
    }

    private static boolean isConditionMet(AlertRule rule, double currentPrice) {
        String condition = rule.condition().toUpperCase().trim();
        return switch (condition) {
            case "ABOVE", "ABOVE_OR_EQUAL" -> currentPrice >= rule.targetPrice();
            case "BELOW", "BELOW_OR_EQUAL" -> currentPrice <= rule.targetPrice();
            default -> false;
        };
    }

    public void removeRuleFromCoolDown(String ruleID) {
        alertCooldownMap.remove(ruleID);
    }
}
