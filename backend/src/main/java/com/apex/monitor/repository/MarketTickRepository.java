package com.apex.monitor.repository;

import com.apex.monitor.model.MarketTickEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MarketTickRepository extends JpaRepository<MarketTickEntity, Long> {


}
