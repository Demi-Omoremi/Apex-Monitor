package com.apex.monitor.dto;

import jakarta.validation.constraints.NotBlank;

public class StockRequest {

    @NotBlank
    private String symbol;

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }
}
