package com.apex.monitor.repository;

import com.apex.monitor.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface AssetRepository extends JpaRepository<Asset, String> {


    List<Asset> findTop10BySymbolStartingWithIgnoreCaseOrNameContainingIgnoreCase(String symbol, String name);
}
