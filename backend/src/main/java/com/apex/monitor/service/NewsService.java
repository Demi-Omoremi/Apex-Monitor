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

    private final AlpacaConfig alpacaConfig;

    public NewsService(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;
        mapper.registeredModules();
    }



    public List<News> getRecentNews(int limit) throws IOException, InterruptedException {
        if (limit > 50) throw new RuntimeException();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://data.alpaca.markets/v1beta1/news?sort=desc&limit="+limit))
                .header("accept", "application/json")
                .header("APCA-API-KEY-ID", alpacaConfig.getKeyId())
                .header("APCA-API-SECRET-KEY", alpacaConfig.getSecretKey())
                .method("GET", HttpRequest.BodyPublishers.noBody())
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(response.body());

        return mapper.convertValue(
                root.path("news"),
                mapper.getTypeFactory().constructCollectionType(List.class, News.class)
        );




    }

    public List<News> getRecentNews() throws IOException, InterruptedException {
        return getRecentNews(10);
    }




}
