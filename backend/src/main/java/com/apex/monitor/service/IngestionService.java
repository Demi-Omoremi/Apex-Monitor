package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.AlertRuleEntity;
import com.apex.monitor.model.MarketTick;
import com.apex.monitor.registry.AlertRegistry;
import com.apex.monitor.registry.TickerTracker;
import com.apex.monitor.repository.AlertRuleRepository;
import net.jacobpeterson.alpaca.AlpacaAPI;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;


import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;


@Service
public class IngestionService extends TextWebSocketHandler {
    private volatile WebSocketSession currentSession;
    private final AlpacaConfig alpacaConfig;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AlertRegistry alertRegistry;
    private final AlertRuleRepository alertRuleRepository;
    private final TickerTracker tickerTracker;
    private final SseService sseService;


    private  boolean subscriptionInitialized = false;
    private final Object sessionLock = new Object();


    public IngestionService(AlpacaConfig alpacaConfig, ObjectMapper objectMapper,
                            KafkaTemplate<String, Object> kafkaTemplate, AlertRuleRepository alertRuleRepository,
                            AlertRegistry alertRegistry, TickerTracker tickerTracker, SseService sseService) {

        this.alpacaConfig = alpacaConfig;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.alertRegistry = alertRegistry;
        this.alertRuleRepository = alertRuleRepository;
        this.tickerTracker = tickerTracker;
        this.sseService = sseService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void connectToStream() {
        try {
            StandardWebSocketClient client = new StandardWebSocketClient();

            client.execute(this, "wss://stream.data.alpaca.markets/v2/iex");
            System.out.println("Connecting to Alpaca WebSocket Stream...");
        } catch (Exception e) {
            System.err.println("Failed to establish stream connection: " + e.getMessage());
        }


    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        this.currentSession = session;
        System.out.println("Pipe open. Sending Auth cred....");


        String authJson = """
                {
                    "action": "auth",
                    "key": "%s",
                    "secret": "%s"
                }
                """.formatted(alpacaConfig.getKeyId(), alpacaConfig.getSecretKey());
        session.sendMessage(new TextMessage(authJson));




    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String rawJson = message.getPayload();
        System.out.println("Received stream payload: " + rawJson);

        if (rawJson.contains("\"msg\":\"authenticated\"")) {
            System.out.println("Authentication confirmed by Alpaca! Sending subscription details...");

            String subJson = String.format("{\"action\": \"subscribe\", \"trades\": %s}",
                    objectMapper.writeValueAsString(tickerTracker.getPopularSymbols()));
            session.sendMessage(new TextMessage(subJson));

            tickerTracker.addAllSymbols(tickerTracker.getPopularSymbols());

            if (!subscriptionInitialized) {
                for (AlertRuleEntity entity: alertRuleRepository.findAll()) {
                    alertRegistry.addAlert(entity);
                    subscribeToStock(entity.getSymbol());
                }
                subscriptionInitialized = true;
            }




        } else if (rawJson.contains("\"T\":\"t\"")){
            try {
                List<MarketTick> ticks = objectMapper.readValue(rawJson, new TypeReference<List<MarketTick>>() {});

                for (MarketTick tick: ticks) {
                    kafkaTemplate.send("market-ticks", tick.symbol(), tick);
                }
            } catch (Exception e) {
                System.err.println("Failed to parse incoming market ticks: " + e.getMessage());
            }
        }

        System.out.println("Active subscriptions: " + tickerTracker.getSubscriptionSymbols());


    }


    public SubscribeResult subscribeToStock(String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();

        MarketTick existing = tickerTracker.getSubscription(cleanSymbol);
        if (existing != null) {
            return SubscribeResult.alreadySubscribed(existing);
        }

        if (!tickerTracker.hasSubscriptionCapacity(cleanSymbol)) {
            return SubscribeResult.limitReached(TickerTracker.MAX_SUBSCRIPTIONS);
        }

        synchronized (sessionLock) {
            // re-check inside the lock — another thread may have subscribed
            // this exact symbol while we were waiting for the lock
            MarketTick raceCheck = tickerTracker.getSubscription(cleanSymbol);
            if (raceCheck != null) {
                return SubscribeResult.alreadySubscribed(raceCheck);
            }

            if (currentSession != null && currentSession.isOpen()) {
                try {
                    String subJson = String.format("{\"action\": \"subscribe\", \"trades\": [\"%s\"]}", cleanSymbol);
                    currentSession.sendMessage(new TextMessage(subJson));
                    MarketTick marketTick = tickerTracker.initMarketTick(cleanSymbol);
                    tickerTracker.addSubscription(marketTick);
                    System.out.println("Alpaca stream expanded! Added: " + cleanSymbol + ".");
                    sseService.broadcast("subscription-added", marketTick);
                    return SubscribeResult.subscribed(marketTick);
                } catch (Exception e) {
                    System.err.println("Failed to send dynamic subscription for " + cleanSymbol + ": " + e.getMessage());
                    return SubscribeResult.failed(cleanSymbol, e.getMessage());
                }
            }
        }

        return SubscribeResult.failed(cleanSymbol, "Market stream is not connected yet");
    }



    public boolean unsubscribeFromStock(String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();
        if (!tickerTracker.isActiveSubscription(cleanSymbol)) return false;

        synchronized (sessionLock) {
            if (currentSession != null && currentSession.isOpen()) {
                try {
                    String unsubJson = String.format("{\"action\": \"unsubscribe\", \"trades\": [\"%s\"]}", cleanSymbol);
                    currentSession.sendMessage(new TextMessage(unsubJson));
                    MarketTick removed = tickerTracker.removeSubscription(cleanSymbol);
                    return removed != null;
                } catch (Exception e) {
                    System.err.println("Failed to delete dynamic subscription for " + cleanSymbol + ": " + e.getMessage());
                }
            }
        }
        return false;
    }

    public List<String> unsubscribeAll() {
        List<String> symbols = tickerTracker.getSubscriptions().stream()
                .map(MarketTick::symbol)
                .toList();

        if (symbols.isEmpty()) {
            return List.of();
        }

        synchronized (sessionLock) {
            if (currentSession != null && currentSession.isOpen()) {
                try {
                    String symbolsJson = objectMapper.writeValueAsString(symbols);
                    String unsubJson = String.format("{\"action\": \"unsubscribe\", \"trades\": %s}", symbolsJson);
                    currentSession.sendMessage(new TextMessage(unsubJson));

                    List<String> removed = new ArrayList<>();
                    for (String symbol : symbols) {
                        if (tickerTracker.removeSubscription(symbol) != null) {
                            removed.add(symbol);
                        }
                    }
                    return removed;
                } catch (Exception e) {
                    System.err.println("Failed to send bulk unsubscribe: " + e.getMessage());
                }
            }
        }
        return List.of();
    }



    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        System.err.println("Connection dropped! Reason: " + exception.getMessage());
    }


}
