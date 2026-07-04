package com.apex.monitor.registry;

import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.dto.StockItem;
import com.apex.monitor.model.MarketBar;
import com.apex.monitor.model.MarketTick;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TickerTracker {
    private final Map<String, MarketTick> subscriptions = new ConcurrentHashMap<>();
    private final List<String> popularSymbols = List.of("AAPL", "MSFT", "NVDA", "TSLA", "AMD");
    private final Set<String> subscriptionSymbols = new HashSet<>();
    private final Map<String, Double> prevClosingPrices = new ConcurrentHashMap<>();
    private final Map<String, MarketBar> dailyBars = new ConcurrentHashMap<>();
    private final AlpacaConfig alpacaConfig;
    ObjectMapper mapper = new ObjectMapper();
    HttpClient client = HttpClient.newHttpClient();

    public TickerTracker(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;

    }

    public List<MarketTick> getPopularList() {
        List<MarketTick> popularList = new ArrayList<>();

        for (String symbol: popularSymbols) {
            popularList.add(subscriptions.get(symbol));
        }

        return popularList;
    }

    public List<MarketTick> getSubscriptions() {
        List<MarketTick> subs = new ArrayList<>();
        subs.addAll(subscriptions.values());
        return subs;
    }

    public void updateSubscriptions(MarketTick tick) {
        try {
            double closingPrice = getClosingPrice(tick.symbol());
            MarketTick enriched = MarketTick.withPercentageChange(tick, closingPrice);
            subscriptions.put(tick.symbol().toUpperCase(), enriched);
            subscriptionSymbols.add(tick.symbol());

        } catch (Exception e) {
            throw new RuntimeException(e);
        }

    }




    public double getClosingPrice(String symbol) throws IOException, InterruptedException {
        String key = symbol.toUpperCase().trim();
        if (prevClosingPrices.containsKey(key)) {
            return prevClosingPrices.get(key);
        }


        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v2/stocks/" + symbol + "/snapshot?feed=delayed_sip"))
                .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(response.body());
        double closingPrice = root.path("prevDailyBar").path("c").asDouble();
        prevClosingPrices.put(key, closingPrice);
        return closingPrice;
    }

    public List<Double> getClosingPrices(List<String> symbols) throws IOException, InterruptedException {
        List<Double> closingPrices = new ArrayList<>();
        List<String> symbolsLeft = new ArrayList<>();

        for (int i = 0; i < symbols.size(); i++) {
            String clean = symbols.get(i).toUpperCase().trim();
            if (prevClosingPrices.containsKey(clean)) {
                closingPrices.add(prevClosingPrices.get(clean));
            } else {
                symbolsLeft.add(clean);
            }
        }

        if (symbolsLeft.isEmpty()) {
            return closingPrices;
        }

        String remaining = String.join(",", symbolsLeft);
        String encoded = URLEncoder.encode(remaining, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v2/stocks/snapshots?symbols=" + encoded + "&feed=delayed_sip"))
                .header("accept", "application/json")
                .header("APCA-API-KEY-ID", "••••")
                .header("APCA-API-SECRET-KEY", "••••")
                .method("GET", HttpRequest.BodyPublishers.noBody())
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(response.body());

        for (String symbol: symbolsLeft) {
            String clean = symbol.toUpperCase().trim();
            JsonNode snapshot = root.path(clean);
            JsonNode prevDailyBar = snapshot.path("dailyBar");

            if (!prevDailyBar.isMissingNode() && !prevDailyBar.isNull()) {
                Double closingPrice = snapshot.path("prevDailyBar").path("c").asDouble();
                prevClosingPrices.put(clean, closingPrice);
                closingPrices.add(closingPrice);
                if (!dailyBars.containsKey(clean)) {
                    MarketBar dailyBar = mapper.treeToValue(prevDailyBar, MarketBar.class);
                    dailyBars.put(clean, dailyBar);
                }
            } else {
                throw new RuntimeException("DailyBar doesn't exist for this symbol");
            }
        }

        return closingPrices;

    }

    public boolean isValidSymbol(String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();
        return true;
    }

    public void addSubscription(MarketTick tick) {
        String cleanSymbol = tick.symbol().toUpperCase().trim();
        if (!isValidSymbol(cleanSymbol)) return;
        subscriptions.computeIfAbsent(cleanSymbol, k -> tick);
        subscriptionSymbols.add(cleanSymbol);
    }

    public boolean isActiveSubscription(String symbol) {
        if (!subscriptions.containsKey(symbol)) {
            return false;
        }

        return true;
    }

    public Double getCurrentPrice(String symbol)  {
        String clean = symbol.toUpperCase().trim();
        MarketTick tick = subscriptions.get(clean);
        if (tick != null) {
            return tick.price();
        }

        try {
            MarketBar daily = getDailyBar(clean);
            return daily.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (InterruptedException e) {
            throw new RuntimeException("Program was interrupted: ", e);
        }

    }

    public MarketBar getDailyBar(String symbol) throws IOException, InterruptedException {
        String clean = symbol.toUpperCase().trim();
        if (dailyBars.containsKey(clean)) {
            return dailyBars.get(clean);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v2/stocks/" + clean + "/snapshot?feed=delayed_sip"))
                .header("accept", "application/json")
                .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                .method("GET", HttpRequest.BodyPublishers.noBody())
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(response.body());

        JsonNode dailyBarNode = root.path("dailyBar");

        if (dailyBarNode != null && !dailyBarNode.isNull()) {
            MarketBar dailyBar = mapper.treeToValue(dailyBarNode, MarketBar.class);
            dailyBars.put(clean, dailyBar);
            return dailyBar;
        } else {
            throw new RuntimeException("DailyBar doesn't exist for this symbol");
        }
    }

    public List<MarketBar> getDailyBars(List<String> symbols) throws IOException, InterruptedException {
        List<MarketBar> marketBarList = new ArrayList<>();
        List<String> symbolsLeft = new ArrayList<>();

        for (int i = 0; i < symbols.size(); i++) {
            String clean = symbols.get(i).toUpperCase().trim();
            if (dailyBars.containsKey(clean)) {
                marketBarList.add(dailyBars.get(clean));
            } else {
                symbolsLeft.add(clean);
            }
        }

        if (symbolsLeft.isEmpty()) {
            return marketBarList;
        }

        String remaining = String.join(",", symbolsLeft);
        String encoded = URLEncoder.encode(remaining, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v2/stocks/snapshots?symbols=" + encoded + "&feed=delayed_sip"))
                .header("accept", "application/json")
                .header("APCA-API-KEY-ID", "••••")
                .header("APCA-API-SECRET-KEY", "••••")
                .method("GET", HttpRequest.BodyPublishers.noBody())
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(response.body());

        for (String symbol: symbolsLeft) {
            String clean = symbol.toUpperCase().trim();
            JsonNode snapshot = root.path(clean);
            JsonNode dailyBarNode = snapshot.path("dailyBar");

            if (!dailyBarNode.isMissingNode() && !dailyBarNode.isNull()) {
                MarketBar dailyBar = mapper.treeToValue(dailyBarNode, MarketBar.class);
                dailyBars.put(clean, dailyBar);
                marketBarList.add(dailyBar);
                if (!prevClosingPrices.containsKey(clean)) {
                    Double closingPrice = snapshot.path("prevDailyBar").path("c").asDouble();
                    prevClosingPrices.put(clean, closingPrice);
                }
            } else {
                throw new RuntimeException("DailyBar doesn't exist for this symbol");
            }
        }

        return marketBarList;

    }

    public List<String> getPopularSymbols() {
        return popularSymbols;
    }

    public MarketTick initMarketTick(String symbol) {

        try {
            String clean = symbol.toUpperCase().trim();
            MarketBar bar = getDailyBar(clean);
            double closingPrice = getClosingPrice(clean);

            double pctChange = closingPrice == 0 ? 0.0 : ((bar.close() - closingPrice) / closingPrice) * 100;
            MarketTick tick = new MarketTick(clean, bar.close(), null, bar.timestamp(), null, pctChange);
            return tick;

        } catch (Exception e) {
            System.err.println("Failed to initalize a market tick for " + symbol);
            return new MarketTick(symbol, 0.0,0, Instant.now(), null);
        }
    }

    @PostConstruct
    public void initSubscription() {
        for (String symbol: popularSymbols) {
            subscriptions.put(symbol, initMarketTick(symbol));
        }
    }

    public Set<String> getSubscriptionSymbols() {
        return subscriptionSymbols;
    }

    public void addSymbol(String symbol) {
        String clean = symbol.toUpperCase().trim();
        addSubscription(initMarketTick(clean));
        subscriptionSymbols.add(clean);
    }

    public void addAllSymbols(List<String> symbols) {
        for (String symbol: symbols) {
            addSymbol(symbol);
        }
    }

    public double getPercentageChange(String symbol) {

        String clean = symbol.toUpperCase().trim();
        try {
            double currentPrice = getCurrentPrice(clean);
            double closingPrice = getClosingPrice(clean);
            return ((currentPrice - closingPrice) / closingPrice) * 100;

        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }


    }

    public StockItem getStockItem(String symbol) {
        String clean = symbol.toUpperCase().trim();
        return new StockItem(clean, getCurrentPrice(clean), getPercentageChange(clean));
    }

    public List<StockItem> getStockItems(List<String> symbols) {
        List<StockItem> stockItemList = new ArrayList<>();
        ensureBarsCached(symbols);
        for (String symbol: symbols) {
            String clean = symbol.toUpperCase().trim();
            Double currentPrice = getCurrentPrice(clean);
            Double pctChange = getPercentageChange(clean);
            stockItemList.add(new StockItem(symbol, currentPrice, pctChange));
        }
        return stockItemList;

    }

    private void ensureBarsCached(List<String> symbols) {
        try {
            getDailyBars(symbols);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // restore interrupt status
            throw new RuntimeException("Interrupted while fetching daily bars", e);
        } catch (IOException e) {
            throw new RuntimeException("Failed to fetch daily bars from Alpaca", e);
        }
    }
}
