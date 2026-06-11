package com.apex.monitor.service;


import com.apex.monitor.model.AlertRule;
import com.apex.monitor.model.MarketTick;
import com.apex.monitor.model.MarketTickEntity;
import com.apex.monitor.model.TriggeredAlert;
import com.apex.monitor.registry.AlertRegistry;
import com.apex.monitor.registry.TickerTracker;
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
    private final Map<String, Instant> alertCooldownMap = new ConcurrentHashMap<>();
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final SseService service;
    private final TickerTracker tickerTracker;

    private static final long COOLDOWN_SECONDS = 5;

    public MarketConsumerService(MarketTickRepository marketTickRepository, AlertRegistry alertRegistry,
                                 KafkaTemplate<String, Object> kafkaTemplate, SseService service, TickerTracker tickerTracker) {
        this.marketTickRepository = marketTickRepository;
        this.alertRegistry = alertRegistry;
        this.kafkaTemplate = kafkaTemplate;
        this.service = service;
        this.tickerTracker = tickerTracker;

    }

    @KafkaListener(topics = "market-ticks", groupId = "apex-monitor-group")
    public void consumeMarketTicks(MarketTick marketTick) {
        try {
            MarketTickEntity entity = new MarketTickEntity();
            entity.setSymbol(marketTick.symbol());
            entity.setPrice(marketTick.price());
            entity.setSize(marketTick.size());

            entity.setTimestamp(marketTick.timestamp() != null ? marketTick.timestamp() : Instant.now());

            tickerTracker.populatePopular(marketTick);

            checkTrigger(marketTick);
            marketTickRepository.save(entity);
            System.out.println("MarketTickEntity successfully saved to repository!");


            service.broadcast("TICK", marketTick);



        } catch (Exception e) {
            System.err.println("Error processing consumed Kafka message: " + e.getMessage());
        }

    }



    public void checkTrigger(MarketTick marketTick) {
        String cleanSymbol = marketTick.symbol().toUpperCase();
        double currentPrice = marketTick.price();
        List<AlertRule> ruleList = alertRegistry.getAlertRules(cleanSymbol);

        if (ruleList == null || ruleList.isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        for (AlertRule rule : ruleList) {
            boolean isConditionMet = false;
            if (rule.condition().equalsIgnoreCase("ABOVE") && currentPrice >= rule.targetPrice()) {
                isConditionMet = true;

            } else if (rule.condition().equalsIgnoreCase("BELOW") && currentPrice <= rule.targetPrice()) {
                isConditionMet = true;
            }


            if (isConditionMet) {

                Instant last = alertCooldownMap.get(rule.id());

                if (last == null || Duration.between(last, now).getSeconds() >= COOLDOWN_SECONDS) {
                    alertCooldownMap.put(rule.id(), now);

                    TriggeredAlert triggeredAlert = new TriggeredAlert(rule.id(), cleanSymbol, rule.targetPrice(),
                            currentPrice, rule.condition(), now);

                    kafkaTemplate.send("triggered-alerts", rule.id(), triggeredAlert);

                    System.out.printf("➔ [Engine] Forwarded Triggered Alert for %s to Kafka topic 'triggered-alerts'%n", cleanSymbol);


                }


            }
            //future cases for size and etc will also be here!

        }
    }

    public void removeRuleFromCoolDown(String ruleID) {
        alertCooldownMap.remove(ruleID);
    }
}
