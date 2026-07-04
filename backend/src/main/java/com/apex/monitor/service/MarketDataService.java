package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.dto.StockItem;
import com.apex.monitor.enums.Timeframe;
import com.apex.monitor.model.MarketBar;
import com.apex.monitor.registry.TickerTracker;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.cfg.MapperBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class MarketDataService {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final AlpacaConfig alpacaConfig;
    private final Map<String, Map<Timeframe, List<MarketBar>>> graphCache = new ConcurrentHashMap<>();
    private final TickerTracker tickerTracker;
    private final MapperBuilder mapperBuilder;


    public MarketDataService(AlpacaConfig alpacaConfig, TickerTracker tickerTracker, MapperBuilder mapperBuilder) {
        this.alpacaConfig = alpacaConfig;
        this.tickerTracker = tickerTracker;
        this.mapperBuilder = mapperBuilder;
    }



    public List<MarketBar> getHistoricalMarketData(String symbol, Timeframe timeframe) {
        String clean = symbol.toUpperCase().trim();

        graphCache.computeIfAbsent(clean, k -> new ConcurrentHashMap<>());

        if (graphCache.get(clean).containsKey(timeframe)) {
            return graphCache.get(clean).get(timeframe);
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v2/stocks/"+clean+"/bars?timeframe="+timeframe.barSize+"&start="+timeframe.getStartDate()+"&limit=1000&adjustment=raw&feed=sip&sort=asc"))
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
            graphCache.get(clean).put(timeframe, histBar);
            return histBar;



        } catch (RuntimeException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);
        } catch (IOException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);
        } catch (InterruptedException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);        }
    }

    public List<StockItem> getMostActive(String symbol) {
        try {
            String clean = symbol.toUpperCase().trim();
            List<String> symbols = new CopyOnWriteArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/most-actives?by=trades&top=10"))
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

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public List<StockItem> getHighestVolumeStock(String symbol) {
        try {
            String clean = symbol.toUpperCase().trim();
            List<String> symbols = new CopyOnWriteArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/most-actives?by=volume&top=10"))
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

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }




    }


    public List<StockItem> getStockGainers(String symbol) {
        try {
            String clean = symbol.toUpperCase().trim();
            List<String> symbols = new CopyOnWriteArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/movers?top=10"))
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

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }




    }

    public List<StockItem> getStockLosers(String symbol) {
        try {
            String clean = symbol.toUpperCase().trim();
            List<String> symbols = new CopyOnWriteArrayList<>();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://data.alpaca.markets/v1beta1/screener/stocks/movers?top=10"))
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

            List<StockItem> stockItemList = tickerTracker.getStockItems(symbols);
            return stockItemList;

        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }




    }
}
