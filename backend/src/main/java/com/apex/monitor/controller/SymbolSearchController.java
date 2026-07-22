package com.apex.monitor.controller;

import com.apex.monitor.model.Asset;
import com.apex.monitor.repository.AssetRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/symbols")
@CrossOrigin(origins = "*")
public class SymbolSearchController {


    private final AssetRepository assetRepository;

    public SymbolSearchController(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    @GetMapping("/search")
    public List<Asset> searchSymbol(@RequestParam(name = "q", required = false) String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }



        String clean = query.trim();

        return assetRepository.findTop10BySymbolStartingWithIgnoreCaseOrNameContainingIgnoreCase(clean, clean);
    }
}
