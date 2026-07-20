package com.apex.monitor.model;

import java.time.LocalDate;
import java.time.LocalTime;

public record TradingDay(LocalDate date, LocalTime open, LocalTime close) {}

