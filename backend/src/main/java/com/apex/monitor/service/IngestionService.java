package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.AlertRuleEntity;
import com.apex.monitor.model.MarketTick;
import com.apex.monitor.registry.AlertRegistry;
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
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;


@Service
public class IngestionService extends TextWebSocketHandler {
    private WebSocketSession currentSession;
    private final AlpacaAPI alpacaAPI;
    private final AlpacaConfig alpacaConfig;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AlertRegistry alertRegistry;
    private final AlertRuleRepository alertRuleRepository;

    private final Set<String> activeSubscriptions = ConcurrentHashMap.newKeySet();
    private final List<String> baselineSymbols = List.of("AAPL", "MSFT", "SPY", "QQQ", "TSLA", "FAKEPACA");

    public IngestionService(AlpacaAPI alpacaAPI, AlpacaConfig alpacaConfig, ObjectMapper objectMapper,
                            KafkaTemplate<String, Object> kafkaTemplate, AlertRuleRepository alertRuleRepository,
                            AlertRegistry alertRegistry) {
        this.alpacaAPI = alpacaAPI;
        this.alpacaConfig = alpacaConfig;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.alertRegistry = alertRegistry;
        this.alertRuleRepository = alertRuleRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void connectToStream() {
        try {
            StandardWebSocketClient client = new StandardWebSocketClient();

            client.execute(this, "wss://stream.data.alpaca.markets/v2/test");
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

        // STEP 2: Inspect the incoming message
        if (rawJson.contains("\"msg\":\"authenticated\"")) {
            System.out.println("Authentication confirmed by Alpaca! Sending subscription details...");


            // Now that you are officially inside, ask for the specific tickers you want
            String subJson = String.format("{\"action\": \"subscribe\", \"trades\": %s}",
                    objectMapper.writeValueAsString(baselineSymbols));
            session.sendMessage(new TextMessage(subJson));
            activeSubscriptions.addAll(baselineSymbols);


            //Add existing Alerts
            for (AlertRuleEntity entity: alertRuleRepository.findAll()) {
                alertRegistry.addAlert(entity);
                subscribeToStock(entity.getSymbol());
            }

            alertRegistry.addAlert("FAKEPACA", 100, "ABOVE");


            System.out.println("📊 Core baseline stream initiated for: " + baselineSymbols);

        } else if (rawJson.contains("\"T\":\"t\"")){
            try {
                List<MarketTick> ticks = objectMapper.readValue(rawJson, new TypeReference<List<MarketTick>>() {});

                for (MarketTick tick: ticks) {
                    //test in terminal the data is coming out
                    System.out.printf("TICK READOUT -> %s: $%.2f%n", tick.symbol(), tick.price());

                    //Shoot into Kafka
                    kafkaTemplate.send("market-ticks", tick.symbol(), tick);

                    System.out.println("Successfully sent to KAFKA HOORAY!!!\n");


                }
            } catch (Exception e) {
                System.err.println("Failed to parse incoming market ticks: " + e.getMessage());
            }
            // STEP 3: If it's not an authentication message, it's live streaming market data!
            // This is where you will parse the metrics and eventually hand them off to Kafka.
        }

        System.out.println("Active subscriptions: " + activeSubscriptions.toString());


    }


    public void subscribeToStock(String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();

        if (activeSubscriptions.contains(cleanSymbol)) {
            System.out.println("Already streaming data for " + cleanSymbol + ". Skipped redundant subscription.");
            return;
        }

        if (currentSession != null && currentSession.isOpen()) {
            try {
                String subJson = String.format("{\"action\": \"subscribe\", \"trades\": [\"%s\"]}", cleanSymbol);
                currentSession.sendMessage(new TextMessage(subJson));
                activeSubscriptions.add(cleanSymbol);
                System.out.println("Alpaca stream expanded! Added: " + cleanSymbol + ".");
            } catch (Exception e) {
                System.err.println("Failed to send dynamic subscription for " + cleanSymbol + ": " + e.getMessage());
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        System.err.println("Connection dropped! Reason: " + exception.getMessage());
    }
}
