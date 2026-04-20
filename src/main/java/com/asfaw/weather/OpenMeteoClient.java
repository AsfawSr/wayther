package com.asfaw.weather;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Component
public class OpenMeteoClient {
    private static final String BASE_URL = "https://api.open-meteo.com/v1/forecast";

    private final RestTemplate restTemplate;

    public OpenMeteoClient(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${wayther.weather.connect-timeout-ms:4000}") long connectTimeoutMs,
            @Value("${wayther.weather.read-timeout-ms:5000}") long readTimeoutMs
    ) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(connectTimeoutMs))
                .setReadTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
    }

    public WeatherSnapshot fetchCurrent(double latitude, double longitude) {
        URI uri = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("current", "precipitation_probability,weather_code")
                .build(true)
                .toUri();

        JsonNode root = fetchJson(uri);
        if (root.path("error").asBoolean(false)) {
            throw new WeatherProviderException("Open-Meteo returned an error: " + root.path("reason").asText("unknown error"));
        }
        JsonNode current = root.path("current");

        double precipitationProbability = current.path("precipitation_probability").asDouble(0);
        int weatherCode = current.path("weather_code").asInt(-1);

        return new WeatherSnapshot(precipitationProbability, weatherCode);
    }

    public WeatherSnapshot fetchFutureNearest(double latitude, double longitude, Instant targetTime) {
        URI uri = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("hourly", "precipitation_probability,weather_code")
                .queryParam("forecast_days", 1)
                .queryParam("timezone", "UTC")
                .build(true)
                .toUri();

        JsonNode root = fetchJson(uri);
        if (root.path("error").asBoolean(false)) {
            throw new WeatherProviderException("Open-Meteo returned an error: " + root.path("reason").asText("unknown error"));
        }
        JsonNode hourly = root.path("hourly");

        JsonNode times = hourly.path("time");
        JsonNode precipitation = hourly.path("precipitation_probability");
        JsonNode weatherCodes = hourly.path("weather_code");

        if (!times.isArray() || times.isEmpty()) {
            return new WeatherSnapshot(0, -1);
        }

        int bestIndex = 0;
        long bestDiff = Long.MAX_VALUE;

        for (int i = 0; i < times.size(); i++) {
            String timeText = times.path(i).asText("");
            Instant pointTime = parseUtcHour(timeText);
            long diff = Math.abs(pointTime.toEpochMilli() - targetTime.toEpochMilli());
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIndex = i;
            }
        }

        double precipitationProbability = precipitation.path(bestIndex).asDouble(0);
        int weatherCode = weatherCodes.path(bestIndex).asInt(-1);

        return new WeatherSnapshot(precipitationProbability, weatherCode);
    }

    private JsonNode fetchJson(URI uri) {
        try {
            JsonNode body = restTemplate.getForObject(uri, JsonNode.class);
            if (body == null) {
                throw new WeatherProviderException("Open-Meteo response body is empty");
            }
            return body;
        } catch (HttpStatusCodeException ex) {
            int statusCode = ex.getStatusCode().value();
            if (statusCode == 429) {
                throw new WeatherProviderException("Open-Meteo rate limit reached. Please retry shortly.", ex);
            }
            if (statusCode >= 500) {
                throw new WeatherProviderException("Open-Meteo is currently unavailable.", ex);
            }
            throw new WeatherProviderException("Open-Meteo rejected weather request.", ex);
        } catch (RestClientException ex) {
            throw new WeatherProviderException("Open-Meteo request failed", ex);
        }
    }

    private Instant parseUtcHour(String timeText) {
        if (timeText == null || timeText.isBlank()) {
            return Instant.EPOCH;
        }
        LocalDateTime localDateTime = LocalDateTime.parse(timeText);
        return localDateTime.toInstant(ZoneOffset.UTC);
    }
}

