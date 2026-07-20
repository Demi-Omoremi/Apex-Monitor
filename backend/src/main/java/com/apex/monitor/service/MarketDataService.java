package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.dto.StockItem;
import com.apex.monitor.enums.Timeframe;
import com.apex.monitor.model.MarketBar;
import com.apex.monitor.registry.TickerTracker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.cfg.MapperBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class MarketDataService {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final AlpacaConfig alpacaConfig;
    private final Map<String, Map<Timeframe, List<MarketBar>>> graphCache = new ConcurrentHashMap<>();
    private final TickerTracker tickerTracker;
    private final MapperBuilder mapperBuilder;
    private final MarketCalendarService marketCalendarService;


    public static final double MIN_PRICE_FLOOR = 5.00;
    public static final int UI_LIST_SIZE = 10;

    private static final ZoneId MARKET_ZONE = ZoneId.of("America/New_York");
    private static final LocalTime MARKET_OPEN = LocalTime.of(9, 30);
    private static final LocalTime MARKET_CLOSE = LocalTime.of(16, 0);


    public MarketDataService(AlpacaConfig alpacaConfig, TickerTracker tickerTracker, MapperBuilder mapperBuilder,
        MarketCalendarService marketCalendarService) {
        this.alpacaConfig = alpacaConfig;
        this.tickerTracker = tickerTracker;
        this.mapperBuilder = mapperBuilder;
        this.marketCalendarService = marketCalendarService;
    }



    public List<MarketBar> getHistoricalMarketData(String symbol, Timeframe timeframe) {
        String clean = symbol.toUpperCase().trim();

        graphCache.computeIfAbsent(clean, k -> new ConcurrentHashMap<>());

        if (graphCache.get(clean).containsKey(timeframe)) {
            return graphCache.get(clean).get(timeframe);
        }

        try {
            LocalDate start = marketCalendarService.getStartDate(timeframe);
            System.out.println("Timeframe: " + timeframe + " days=" + start + " -> start=" + start);
            System.out.println("NOW IN NY: " + ZonedDateTime.now(MARKET_ZONE));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v2/stocks/"+clean+"/bars?timeframe="+timeframe.barSize+"&start="+start.toString()+"&limit=1000&adjustment=raw&feed=sip&sort=asc"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());

            List<MarketBar> histBar = objectMapper.convertValue(
                    root.path("bars"),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, MarketBar.class)
            );
            marketCalendarService.preloadForBars(histBar);
            if (timeframe.isIntraday()) {
                histBar.removeIf(bar -> !marketCalendarService.isMarketHours(bar));
            }

            graphCache.get(clean).put(timeframe, histBar);
            return histBar;



        } catch (RuntimeException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);
        } catch (IOException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);
        } catch (InterruptedException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);        }
    }

    public List<StockItem> getMostActive() {
        try {
            List<String> symbols = new ArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/most-actives?by=trades&top=50"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode rootNode = objectMapper.readTree(response.body());
            JsonNode mostActive = rootNode.path("most_actives");
            if (mostActive.isArray()) {
                for (JsonNode node: mostActive) {
                    symbols.add(node.path("symbol").asString());
                }
            }

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public List<StockItem> getHighestVolumeStock() {
        try {
            List<String> symbols = new ArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/most-actives?by=volume&top=50"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode rootNode = objectMapper.readTree(response.body());
            JsonNode mostActive = rootNode.path("most_actives");
            if (mostActive.isArray()) {
                for (JsonNode node: mostActive) {
                    symbols.add(node.path("symbol").asString());
                }
            }

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }




    }


    public List<StockItem> getStockGainers() {
        try {
            List<String> symbols = new ArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/movers?top=50"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode rootNode = objectMapper.readTree(response.body());
            JsonNode mostActive = rootNode.path("gainers");
            if (mostActive.isArray()) {
                for (JsonNode node: mostActive) {
                    symbols.add(node.path("symbol").asString());
                }
            }

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }




    }

    public List<StockItem> getStockLosers() {
        try {
            List<String> symbols = new ArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/movers?top=50"))
                    .header("accept", "application/json")
                    .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                    .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                    .method("GET", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode rootNode = objectMapper.readTree(response.body());
            JsonNode mostActive = rootNode.path("losers");
            if (mostActive.isArray()) {
                for (JsonNode node: mostActive) {
                    symbols.add(node.path("symbol").asString());
                }
            }

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }




    }


}
