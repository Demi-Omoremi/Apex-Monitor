package com.apex.monitor.service;

import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.TradingDay;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

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

    public JsonNode getLastTradeBeforeClose(String symbol, LocalDate date, TradingDay tradingDay) {

        ZonedDateTime open = date.atTime(tradingDay.open()).atZone(MarketCalendarService.MARKET_ZONE);
        ZonedDateTime close = date.atTime(tradingDay.close()).atZone(MarketCalendarService.MARKET_ZONE);

        String start = open.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        String end = close.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        String url = "https://data.alpaca.markets/v2/stocks/" + symbol + "/trades"
                + "?start=" + URLEncoder.encode(start, StandardCharsets.UTF_8)
                + "&end=" + URLEncoder.encode(end, StandardCharsets.UTF_8)
                + "&limit=1&feed=sip&sort=desc";

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
            throw new RuntimeException("Error fetching last trade: ", e);
        }
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

            JsonNode rootNode = mapper.readTree(response.body());
            return rootNode.path("most_actives");
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






}
