package com.apex.monitor.enums;

import java.time.LocalDate;

public enum Timeframe {

    ONE_DAY("1D", "5Min", 0),
    FIVE_DAY("5D", "30Min", 5),
    ONE_MONTH("1M", "1D", 30),
    THREE_MONTH("3M", "1D", 90),
    SIX_MONTH("6M", "1D", 180),
    ONE_YEAR("1Y", "1D", 365);

    public final String label;
    public final String barSize;
    private final int days;


    Timeframe(String label, String barSize, int days) {
        this.label = label;
        this.barSize = barSize;
        this.days = days;
    }


    public String getStartDate() {
        return LocalDate.now().minusDays(days).toString();
    }
}
