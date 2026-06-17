package com.apex.monitor.registry;

import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.MarketTick;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TickerTracker {
    private final Map<String, MarketTick> subscriptions = new ConcurrentHashMap<>();
    private final List<String> popularSymbols = List.of("AAPL", "MSFT", "NVDA", "TSLA", "AMD");
    private final Map<String, Double> openPriceCache = new ConcurrentHashMap<>();
    private final AlpacaConfig alpacaConfig;
    ObjectMapper mapper = new ObjectMapper();

    public TickerTracker(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;

    }

    public List<MarketTick> getPopularList() {
        List<MarketTick> popularList = new ArrayList<>();

        for (String symbol: popularSymbols) {
            if (!isActiveSubscription(symbol)) {
//                ingestionService.subscribeToStock(symbol);
            }
            popularList.add(subscriptions.get(symbol));
        }

        return popularList;
    }

    public List<MarketTick> getSubscriptions() {
        List<MarketTick> subs = new ArrayList<>();
        subs.addAll(subscriptions.values());
        return subs;
    }

    public void updateSubscriptions(MarketTick tick) throws IOException, InterruptedException {
        double openPrice = getOpenPrice(tick.symbol());
        MarketTick enriched = MarketTick.withPercentageChange(tick, openPrice);
        subscriptions.put(tick.symbol().toUpperCase(), enriched);

    }

    public double getOpenPrice(String symbol) throws IOException, InterruptedException {
        String key = symbol.toUpperCase().trim();
        if (openPriceCache.containsKey(key)) {
            return openPriceCache.get(key);
        }


        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v2/stocks/"+key.toUpperCase()+"/snapshot"))
                .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(response.body());
        double openPrice = root.path("dailyBar").path("o").asDouble();
        openPriceCache.put(key, openPrice);
        return openPrice;
    }

    public boolean isValidSymbol(String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();
        return true;
    }

    public void addSubscription(MarketTick tick) {
        String cleanSymbol = tick.symbol().toUpperCase().trim();
        if (!isValidSymbol(cleanSymbol)) return;
        subscriptions.computeIfAbsent(cleanSymbol, k -> tick);
    }

    public boolean isActiveSubscription(String symbol) {
        if (!subscriptions.containsKey(symbol)) {
            return false;
        }

        return true;
    }

    public void addAll() {

    }





}
