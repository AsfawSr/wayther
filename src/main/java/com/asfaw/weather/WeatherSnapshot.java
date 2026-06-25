package com.asfaw.weather;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public record WeatherSnapshot(
        @JsonProperty("latitude") double latitude,
        @JsonProperty("longitude") double longitude,
        @JsonProperty("timestamp") @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "UTC") Instant timestamp,
        @JsonProperty("condition") String condition,
        @JsonProperty("temperature") double temperature,
        @JsonProperty("windSpeed") double windSpeed,
        @JsonProperty("precipitationProbability") double precipitationProbability,
        @JsonProperty("weatherIcon") String weatherIcon
) {
}

