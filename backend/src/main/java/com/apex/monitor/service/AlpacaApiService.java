package com.apex.monitor.service;

import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.TradingDay;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/*
Important to note not allowed to really call any other service due
to circular issues.

 */
@Service
public class AlpacaApiService {
    private final AlpacaConfig alpacaConfig;
    ObjectMapper mapper = new ObjectMapper();
    HttpClient client = HttpClient.newHttpClient();

    public AlpacaApiService(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;
    }


    public JsonNode getCalendar(LocalDate start, LocalDate end) {
        try {
            String url = "https://api.alpaca.markets/v2/calendar?start=" + start + "&end=" + end;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readTree(response.body());


        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error fetching market calendar: ", e);
        }
    }

    private static final int CLOSE_SEARCH_WINDOW_SECONDS = 5; // 16:00:00 → 16:00:05, plenty given what we saw
    private static final int CLOSE_SEARCH_LIMIT = 10000;

    public JsonNode getLastTradeBeforeClose(String symbol, LocalDate date, TradingDay tradingDay) {
        ZonedDateTime open = date.atTime(tradingDay.open()).atZone(MarketCalendarService.MARKET_ZONE);
        ZonedDateTime close = date.atTime(tradingDay.close()).atZone(MarketCalendarService.MARKET_ZONE);
        ZonedDateTime now = ZonedDateTime.now(MarketCalendarService.MARKET_ZONE);

        if (now.isBefore(close)) {
            // market still open (or hasn't closed yet for this trading day) — just want the latest live trade
            return fetchTrades(symbol, open, now, "iex", 1, "desc", this::selectMostRecentTrade);
        }

        if (now.isBefore(close.plusMinutes(15))) {
            // closed, but SIP isn't available yet on the free tier (15-min delay) —
            // don't block, just fall back to whatever we can see on IEX for now
            System.out.printf("⚠ %s: closed but SIP not yet available (15-min delay) — using last visible trade%n", symbol);
            return fetchTrades(symbol, open, now, "iex", 1, "desc", this::selectMostRecentTrade);
        }

        // SIP available — go find the real closing-auction print, not just "last trade"
        ZonedDateTime searchEnd = close.plusSeconds(CLOSE_SEARCH_WINDOW_SECONDS);
        return fetchTrades(symbol, close, searchEnd, "sip", CLOSE_SEARCH_LIMIT, "asc",
                root -> selectClosingTrade(root, symbol));
    }

    private JsonNode fetchTrades(String symbol, ZonedDateTime start, ZonedDateTime end,
                                 String feed, int limit, String sort,
                                 java.util.function.Function<JsonNode, JsonNode> selector) {
        String startStr = start.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        String endStr = end.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        String url = "https://data.alpaca.markets/v2/stocks/" + symbol + "/trades"
                + "?start=" + URLEncoder.encode(startStr, StandardCharsets.UTF_8)
                + "&end=" + URLEncoder.encode(endStr, StandardCharsets.UTF_8)
                + "&limit=" + limit + "&feed=" + feed + "&sort=" + sort;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(response.body());
            return selector.apply(root);
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error fetching trades for " + symbol, e);
        }
    }

    private JsonNode selectMostRecentTrade(JsonNode root) {
        JsonNode trades = root.path("trades");
        if (!trades.isArray() || trades.isEmpty()) {
            return root; // preserves your existing "no trades found" check downstream
        }
        ObjectNode wrapped = mapper.createObjectNode();
        wrapped.put("symbol", root.path("symbol").asText());
        wrapped.putArray("trades").add(trades.get(0)); // sort=desc, so index 0 = most recent
        return wrapped;
    }

    private JsonNode selectClosingTrade(JsonNode root, String symbol) {
        JsonNode trades = root.path("trades");
        if (!trades.isArray() || trades.isEmpty()) {
            return root;
        }

        JsonNode best = null;
        long bestSize = -1;

        for (JsonNode trade : trades) {
            boolean isCloseTagged = false;
            for (JsonNode cond : trade.path("c")) {
                String code = cond.asText();
                if ("M".equals(code) || "6".equals(code)) {
                    isCloseTagged = true;
                    break;
                }
            }
            if (isCloseTagged) {
                long size = trade.path("s").asLong();
                if (size > bestSize) { // largest print wins — that's the real cross, not a stray small M
                    bestSize = size;
                    best = trade;
                }
            }
        }

        if (best == null) {
            System.err.printf("⚠ No official-close trade found for %s in window — falling back to last trade%n", symbol);
            best = trades.get(trades.size() - 1); // sort=asc here, so last = most recent
        }

        ObjectNode wrapped = mapper.createObjectNode();
        wrapped.put("symbol", symbol);
        wrapped.putArray("trades").add(best);
        return wrapped;
    }

    public JsonNode getDailyBars(List<String> symbols) {
        try {
            String remaining = String.join(",", symbols);
            String encoded = URLEncoder.encode(remaining, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v2/stocks/snapshots?symbols=" + encoded + "&feed=delayed_sip"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error getting dailys bar for symbols: ", e);
        }
    }

    public JsonNode getDailyBar(String symbol) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v2/stocks/" + symbol + "/snapshot?feed=delayed_sip"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error getting daily bar for " + symbol + ": ", e);
        }
    }

    public JsonNode getSnapShot(String symbol) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v2/stocks/" + symbol + "/snapshot?feed=delayed_sip"))
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readTree(response.body());

        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error getting snapshot for " + symbol + ": ", e);
        }
    }

    public JsonNode getSnapShots(List<String> symbols) {
        try {
            String remaining = String.join(",", symbols);
            String encoded = URLEncoder.encode(remaining, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v2/stocks/snapshots?symbols=" + encoded + "&feed=delayed_sip"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error fetching snapshots: ", e);
        }
    }

    public JsonNode getStockMovers() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/movers?top=50"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            return mapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Unable to fetch stock movers: ", e);
        }
    }

    public JsonNode getMostActiveStocks() {
        try {

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/most-actives?by=trades&top=50"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            return mapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Unable to fetch most active stocks: ", e);
        }
    }

    public JsonNode getHighestVolumeStocks() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/most-actives?by=volume&top=50"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            return mapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Unable to fetch most active stocks: ", e);
        }
    }

    public JsonNode get(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readTree(response.body());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error calling Alpaca API: " + url, e);
        }
    }






}
