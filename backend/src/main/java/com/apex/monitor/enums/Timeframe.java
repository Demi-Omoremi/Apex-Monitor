package com.apex.monitor.enums;

import lombok.Getter;

import java.time.DayOfWeek;
import java.time.LocalDate;

public enum Timeframe {

    ONE_DAY("1D", "5Min", 0, 0),
    FIVE_DAY("5D", "30Min", 5, 0),
    ONE_MONTH("1M", "1D", 0, 1),
    THREE_MONTH("3M", "1D", 0, 3),
    SIX_MONTH("6M", "1D", 0, 6),
    ONE_YEAR("1Y", "1D", 0, 12);

    public final String label;
    public final String barSize;
    private final int tradingDaysBack;
    private final int monthsBack;

    Timeframe(String label, String barSize, int tradingDaysBack, int monthsBack) {
        this.label = label;
        this.barSize = barSize;
        this.tradingDaysBack = tradingDaysBack;
        this.monthsBack = monthsBack;
    }

    public int getTradingDaysBack() { return tradingDaysBack; }
    public int getMonthsBack() { return monthsBack; }
    public boolean isIntraday() { return barSize.endsWith("Min"); }
    public boolean isMonthBased() { return monthsBack > 0; }
}





