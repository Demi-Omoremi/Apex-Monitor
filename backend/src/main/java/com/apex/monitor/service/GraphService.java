package com.apex.monitor.service;


import com.apex.monitor.config.AlpacaConfig;
import com.apex.monitor.model.MarketBar;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GraphService {

    private final AlpacaConfig alpacaConfig;

    public GraphService(AlpacaConfig alpacaConfig) {
        this.alpacaConfig = alpacaConfig;
    }

    public List<MarketBar> getGraphDate(String symbol, int timeline) {



        return null;
    }
}
