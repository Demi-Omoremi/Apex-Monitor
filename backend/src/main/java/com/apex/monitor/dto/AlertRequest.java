package com.apex.monitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class AlertRequest {

    @NotBlank(message = "Ticker symbol is required.")
    private String symbol;

    @Positive(message = "Threshold must be positive.")
    private double targetPrice;

    @NotBlank(message = "Condition must be specified (ABOVE or BELOW).")
    private String condition;

    public double getTargetPrice() {
        return targetPrice;
    }

    public void setTargetPrice(double targetPrice) {
        this.targetPrice = targetPrice;
    }

    public String getCondition() {
        return condition;
    }

    public void setCondition(String condition) {
        this.condition = condition;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }
}
