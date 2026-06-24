package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.MarketBar;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

@Service
public class GraphService {

    private final AlpacaConfig alpacaConfig;
    private final HttpClient httpClient = HttpClient.newHttpClient();


    public GraphService(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;
    }

    public List<MarketBar> initGraphTimeline(String symbol) {


        return null;
    }
}
