package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.News;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

@Service
public class NewsService {
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    private final AlpacaConfig alpacaConfig;

    public NewsService(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;
        mapper.registeredModules();
    }



    public List<News> getRecentMarketNews(int limit) {
        if (limit > 50) throw new RuntimeException();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v1beta1/news?sort=desc&limit="+limit))
                .header("accept", "application/json")
                .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                .method("GET", HttpRequest.BodyPublishers.noBody())
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(response.body());

            return mapper.convertValue(
                    root.path("news"),
                    mapper.getTypeFactory().constructCollectionType(List.class, News.class)
            );


        } catch (IOException e) {
            System.err.println("Network error when calling Alpaca: " + e.getMessage());
            throw new RuntimeException("Failed to fetch news due to a network issue", e);

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();
            throw new RuntimeException("The news fetch operation was interrupted", e);
        }
    }

    public List<News> getRecentMarketNews() throws IOException, InterruptedException {
        return getRecentMarketNews(10);
    }

    public List<News> getRecentCompanyNews(int limit, String symbol) {
        if (limit > 50) throw new RuntimeException();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v1beta1/news?sort=desc&symbols="+symbol+"&limit="+limit))
                .header("accept", "application/json")
                .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                .method("GET", HttpRequest.BodyPublishers.noBody())
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(response.body());

            return mapper.convertValue(
                    root.path("news"),
                    mapper.getTypeFactory().constructCollectionType(List.class, News.class)
            );

        } catch (IOException e) {
            System.err.println("Network error when calling Alpaca: " + e.getMessage());
            throw new RuntimeException("Failed to fetch news due to a network issue", e);

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();
            throw new RuntimeException("The news fetch operation was interrupted", e);
        }


    }

    public List<News> getRecentCompanyNews(String symbol) {
        return getRecentCompanyNews(10, symbol);
    }




}
