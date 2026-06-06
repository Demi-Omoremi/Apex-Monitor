package com.apex.monitor.config;


import lombok.Getter;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.MarketDataWebsocketSourceType;
import net.jacobpeterson.alpaca.model.util.apitype.TraderAPIEndpointType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AlpacaConfig {
    @Getter
    @Value("${alpaca.api.key.id}")
    private String keyId;

    @Getter
    @Value("${alpaca.api.secret.key}")
    private String secretKey;

    private final TraderAPIEndpointType endpointType = TraderAPIEndpointType.PAPER;
    private final MarketDataWebsocketSourceType sourceType = MarketDataWebsocketSourceType.IEX;

    @Bean
    public AlpacaAPI alpacaAPI() {
        return new AlpacaAPI(keyId, secretKey, endpointType, sourceType);
    }


}


