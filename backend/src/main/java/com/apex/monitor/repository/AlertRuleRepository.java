package com.apex.monitor.repository;

import com.apex.monitor.model.AlertRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRuleRepository extends JpaRepository<AlertRuleEntity, Long> {
}
