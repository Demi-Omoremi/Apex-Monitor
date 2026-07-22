package com.apex.monitor.service;

import com.apex.monitor.model.Asset;
import com.apex.monitor.repository.AssetRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;


@Service
public class SymbolDatabaseService {

    private final AssetRepository assetRepository;
    private final AlpacaApiService alpacaApiService;

    public SymbolDatabaseService(AssetRepository assetRepository, AlpacaApiService alpacaApiService) {
        this.assetRepository = assetRepository;
        this.alpacaApiService = alpacaApiService;
    }

    @PostConstruct
    @Scheduled(cron = "0 0 4 * * *")
    public void syncAssetToDatabase() {
        JsonNode rootArray = alpacaApiService.get("https://paper-api.alpaca.markets/v2/assets?status=active&attributes=");
        List<Asset> entities = new ArrayList<>();

        if (rootArray.isArray()) {
            for (JsonNode node: rootArray) {

                if (node.path("tradable").asBoolean()) {
                    String symbol = node.path("symbol").asString();
                    String name = node.path("name").asString();
                    entities.add(new Asset(symbol, name));
                }


            }
        }

        assetRepository.saveAll(entities);
        System.out.println("Successfully synced " + entities.size() + " assets to PostgreSQL.");


    }
}
