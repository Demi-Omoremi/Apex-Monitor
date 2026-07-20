package com.apex.monitor.service;

import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.enums.Timeframe;
import com.apex.monitor.model.MarketBar;
import com.apex.monitor.model.TradingDay;

import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.*;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MarketCalendarService {

    public static final ZoneId MARKET_ZONE = ZoneId.of("America/New_York");

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AlpacaConfig alpacaConfig;
    private final AlpacaApiService alpacaApiService;

    // key = trading date, value = that day's actual open/close
    private final Map<LocalDate, TradingDay> calendarCache = new ConcurrentHashMap<>();

    private LocalDate cachedFrom;
    private LocalDate cachedTo;


    public MarketCalendarService(AlpacaConfig alpacaConfig, AlpacaApiService alpacaApiService) {
        this.alpacaApiService = alpacaApiService;
        this.alpacaConfig = alpacaConfig;
    }

    private void ensureCached(LocalDate start, LocalDate end) {
        if (cachedFrom != null && cachedTo != null
                && !start.isBefore(cachedFrom) && !end.isAfter(cachedTo)) {
            return; // already have this range
        }
        fetchCalendar(start, end);
    }

    public void preloadForBars(List<MarketBar> bars) {
        if (bars == null || bars.isEmpty()) return;

        LocalDate start = bars.get(0).timestamp().atZone(MARKET_ZONE).toLocalDate();
        LocalDate end = bars.get(bars.size() - 1).timestamp().atZone(MARKET_ZONE).toLocalDate();

        ensureCached(start, end);
    }

    private void fetchCalendar(LocalDate start, LocalDate end) {
        JsonNode root = alpacaApiService.getCalendar(start, end);

        for (JsonNode node : root) {
            LocalDate date = LocalDate.parse(node.path("date").asString());
            LocalTime open = LocalTime.parse(node.path("open").asString());
            LocalTime close = LocalTime.parse(node.path("close").asString());
            calendarCache.put(date, new TradingDay(date, open, close));
        }

        cachedFrom = start;
        cachedTo = end;
    }

    public boolean isMarketHours(MarketBar bar) {
        ZonedDateTime barTime = bar.timestamp().atZone(MARKET_ZONE);
        LocalDate day = barTime.toLocalDate();

        ensureCached(day.minusDays(5), day.plusDays(1)); // small padding around the day

        TradingDay tradingDay = calendarCache.get(day);
        if (tradingDay == null) {
            return false; // not a trading day at all (weekend/holiday) -> invalid
        }

        LocalTime time = barTime.toLocalTime();
        return !time.isBefore(tradingDay.open()) && !time.isAfter(tradingDay.close());
    }

    public LocalDate getStartDate(Timeframe timeframe) {
        if (timeframe.isMonthBased()) {
            return LocalDate.now(MARKET_ZONE).minusMonths(timeframe.getMonthsBack());
        }
        return getStartDateByTradingDays(timeframe.getTradingDaysBack());
    }

    private LocalDate getStartDateByTradingDays(int tradingDaysBack) {
        ZonedDateTime nowNY = ZonedDateTime.now(MARKET_ZONE);
        LocalDate today = nowNY.toLocalDate();

        ensureCached(today.minusDays((long) (tradingDaysBack * 1.6) + 15), today.plusDays(2));

        LocalDate effectiveToday = calendarCache.get(today) != null
                && !nowNY.toLocalTime().isBefore(calendarCache.get(today).open())
                ? today
                : calendarCache.keySet().stream()
                .filter(d -> d.isBefore(today))
                .max(Comparator.naturalOrder())
                .orElseThrow();

        List<LocalDate> tradingDays = calendarCache.keySet().stream()
                .filter(d -> !d.isAfter(effectiveToday))
                .sorted(Comparator.reverseOrder())
                .toList();
        int index = Math.max(tradingDaysBack - 1, 0);
        return tradingDays.get(index);
    }

    public TradingDay getTradingDay(LocalDate date) {
        ensureCached(date.minusDays(5), date.plusDays(1));
        TradingDay day = calendarCache.get(date);
        if (day == null) {
            throw new IllegalArgumentException("Not a trading day: " + date);
        }
        return day;
    }

    public LocalDate getMostRecentTradingDay(ZonedDateTime now) {
        LocalDate today = now.toLocalDate();
        ensureCached(today.minusDays(10), today.plusDays(1));

        TradingDay todaySession = calendarCache.get(today);
        boolean todayHasOpened = todaySession != null && !now.toLocalTime().isBefore(todaySession.open());

        if (todayHasOpened) {
            return today;
        }

        return calendarCache.keySet().stream()
                .filter(d -> d.isBefore(today))
                .max(Comparator.naturalOrder())
                .orElseThrow(() -> new IllegalStateException("No prior trading day found near " + today));
    }


}