package com.apex.monitor.repository;

import com.apex.monitor.model.Asset;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface AssetRepository extends JpaRepository<Asset, String> {

    @Query("""
        SELECT a FROM Asset a
        WHERE UPPER(a.symbol) LIKE UPPER(CONCAT(:query, '%'))
           OR UPPER(a.name) LIKE UPPER(CONCAT('%', :query, '%'))
        ORDER BY
           CASE WHEN UPPER(a.symbol) LIKE UPPER(CONCAT(:query, '%')) THEN 0 ELSE 1 END,
           LENGTH(a.symbol)
        """)
    List<Asset> searchAssets(@Param("query") String query, Pageable pageable);
}