package com.apex.monitor.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

public record News(
        Long id,
        String author,
        String headline,
        String summary,
        String source,
        List<String> symbols,
        @JsonProperty("created_at") Instant createdAt,
        @JsonProperty("updated_at") Instant updatedAt,
        String url

) {
}
