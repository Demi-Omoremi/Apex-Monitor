package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.enums.Timeframe;
import com.apex.monitor.model.MarketBar;
import org.springframework.stereotype.Service;
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

@Service
public class MarketDataService {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final AlpacaConfig alpacaConfig;
    private final Map<String, Map<Timeframe, List<MarketBar>>> cache = new ConcurrentHashMap<>();


    public MarketDataService(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;
    }



    public List<MarketBar> getHistoricalMarketData(String symbol, Timeframe timeframe) {
        String clean = symbol.toUpperCase().trim();

        cache.computeIfAbsent(clean, k -> new ConcurrentHashMap<>());

        if (cache.get(clean).containsKey(timeframe)) {
            return cache.get(clean).get(timeframe);
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
            cache.get(clean).put(timeframe, histBar);
            return histBar;



        } catch (RuntimeException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);
        } catch (IOException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);
        } catch (InterruptedException e) {
            throw new RuntimeException("Error trying to get historical data: ", e);        }
    }
}
