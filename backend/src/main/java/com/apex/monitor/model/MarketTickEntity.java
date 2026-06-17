package com.apex.monitor.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "market_ticks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketTickEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String symbol;
    private Double price;
    private Long size;
    private Instant timestamp;
    private Double percentageChange;

}
