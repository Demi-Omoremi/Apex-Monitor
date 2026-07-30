package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.dto.StockItem;
import com.apex.monitor.enums.Timeframe;
import com.apex.monitor.model.HistoricalBarsResponse;
import com.apex.monitor.model.LatestTradeResponse;
import com.apex.monitor.model.MarketBar;
import com.apex.monitor.model.TradingDay;
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
import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class MarketDataService {
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final TickerTracker tickerTracker;
    private final AlpacaApiService alpacaApiService;
    private final MapperBuilder mapperBuilder;
    private final MarketCalendarService marketCalendarService;


    public static final double MIN_PRICE_FLOOR = 5.00;
    public static final int UI_LIST_SIZE = 10;

    private static final ZoneId MARKET_ZONE = ZoneId.of("America/New_York");
    private static final LocalTime MARKET_OPEN = LocalTime.of(9, 30);
    private static final LocalTime MARKET_CLOSE = LocalTime.of(16, 0);


    public MarketDataService(TickerTracker tickerTracker, MapperBuilder mapperBuilder,
        MarketCalendarService marketCalendarService, AlpacaApiService alpacaApiService) {
        this.tickerTracker = tickerTracker;
        this.mapperBuilder = mapperBuilder;
        this.marketCalendarService = marketCalendarService;
        this.alpacaApiService = alpacaApiService;
    }



    private record CachedBars(HistoricalBarsResponse response, Instant fetchedAt) {}
    private final Map<String, Map<Timeframe, CachedBars>> graphCache = new ConcurrentHashMap<>();
    private static final Duration INTRADAY_TODAY_TTL = Duration.ofMinutes(5); // matches your instinct

    public HistoricalBarsResponse getHistoricalMarketData(String symbol, Timeframe timeframe) {
        String clean = symbol.toUpperCase().trim();
        graphCache.computeIfAbsent(clean, k -> new ConcurrentHashMap<>());

        LocalDate today = marketCalendarService.getMostRecentTradingDay(ZonedDateTime.now(MarketCalendarService.MARKET_ZONE));
        CachedBars cached = graphCache.get(clean).get(timeframe);

        if (cached != null) {
            LocalDate lastBarDate = cached.response().bars().isEmpty()
                    ? null
                    : cached.response().bars().get(cached.response().bars().size() - 1)
                    .timestamp().atZone(MarketCalendarService.MARKET_ZONE).toLocalDate();

            boolean windowIsBehind = lastBarDate != null && lastBarDate.isBefore(today);
            boolean cacheCoversToday = lastBarDate != null && lastBarDate.equals(today);

            if (!windowIsBehind) {
                boolean stillFresh = !cacheCoversToday
                        || Duration.between(cached.fetchedAt(), Instant.now()).compareTo(INTRADAY_TODAY_TTL) < 0;
                if (stillFresh) {
                    return cached.response();
                }
            }
        }

        LocalDate start = marketCalendarService.getStartDate(timeframe);
        JsonNode root = alpacaApiService.get("https://data.alpaca.markets/v2/stocks/"+clean+"/bars?timeframe="+timeframe.barSize+"&start="+start.toString()+"&limit=1000&adjustment=raw&feed=sip&sort=asc");

        List<MarketBar> histBar = objectMapper.convertValue(
                root.path("bars"),
                objectMapper.getTypeFactory().constructCollectionType(List.class, MarketBar.class)
        );
        marketCalendarService.preloadForBars(histBar);

        Double previousClose = null;

        if (timeframe.isIntraday()) {
            histBar.removeIf(bar -> !marketCalendarService.isMarketHours(bar));

            if (!histBar.isEmpty()) {
                LocalDate actualWindowStart = histBar.get(0).timestamp()
                        .atZone(MarketCalendarService.MARKET_ZONE)
                        .toLocalDate();

                LocalDate priorTradingDay = marketCalendarService.getPreviousTradingDay(actualWindowStart);
                TradingDay priorSession = marketCalendarService.getTradingDay(priorTradingDay);

                JsonNode priorTradeNode = alpacaApiService.getLastTradeBeforeClose(clean, priorTradingDay, priorSession);
                LatestTradeResponse priorTrade = objectMapper.convertValue(priorTradeNode, LatestTradeResponse.class);
                previousClose = priorTrade.trades().getFirst().p();
            }
        }

        if (!histBar.isEmpty()) {
            MarketBar lastBar = histBar.get(histBar.size() - 1);
            LocalDate lastBarDate = lastBar.timestamp()
                    .atZone(MarketCalendarService.MARKET_ZONE)
                    .toLocalDate();

            try {
                TradingDay lastSession = marketCalendarService.getTradingDay(lastBarDate);
                JsonNode verifiedNode = alpacaApiService.getLastTradeBeforeClose(clean, lastBarDate, lastSession);
                LatestTradeResponse verifiedTrade = objectMapper.convertValue(verifiedNode, LatestTradeResponse.class);
                double verifiedClose = verifiedTrade.trades().getFirst().p();

                histBar.set(histBar.size() - 1, new MarketBar(
                        lastBar.symbol(),
                        verifiedClose,
                        lastBar.high(),
                        lastBar.low(),
                        lastBar.tradeCount(),
                        lastBar.open(),
                        lastBar.timestamp(),
                        lastBar.volume(),
                        lastBar.vwap()
                ));
            } catch (Exception e) {
                log.warn("Could not verify official close for {} on {} — using raw bar close", clean, lastBarDate, e);
            }
        }

        HistoricalBarsResponse response = new HistoricalBarsResponse(histBar, previousClose);
        graphCache.get(clean).put(timeframe, new CachedBars(response, Instant.now()));
        return response;
    }

    public List<StockItem> getMostActive() {
        List<String> symbols = new ArrayList<>();
        JsonNode rootNode = alpacaApiService.getMostActiveStocks();
        JsonNode mostActive = rootNode.path("most_actives");

        if (mostActive.isArray()) {
            for (JsonNode node: mostActive) {
                symbols.add(node.path("symbol").asString());
            }
        }

        return tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
    }

    public List<StockItem> getHighestVolumeStock() {
        List<String> symbols = new ArrayList<>();
        JsonNode rootNode = alpacaApiService.getHighestVolumeStocks();
        JsonNode mostActive = rootNode.path("most_actives");
        if (mostActive.isArray()) {
            for (JsonNode node: mostActive) {
                symbols.add(node.path("symbol").asString());
            }
        }

        return tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
    }


    public List<StockItem> getStockGainers() {
        List<String> symbols = new ArrayList<>();
        JsonNode rootNode = alpacaApiService.getStockMovers();
        JsonNode mostActive = rootNode.path("gainers");

        if (mostActive.isArray()) {
            for (JsonNode node: mostActive) {
                symbols.add(node.path("symbol").asString());
            }
        }

        List<StockItem> stockItemList = tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
        return stockItemList;
    }

    public List<StockItem> getStockLosers() {
        List<String> symbols = new ArrayList<>();
        JsonNode rootNode = alpacaApiService.getStockMovers();
        JsonNode mostActive = rootNode.path("losers");

        if (mostActive.isArray()) {
            for (JsonNode node: mostActive) {
                symbols.add(node.path("symbol").asString());
            }
        }

        List<StockItem> stockItemList = tickerTracker.getStockItems(symbols, MIN_PRICE_FLOOR, UI_LIST_SIZE);
        return stockItemList;
    }




}
