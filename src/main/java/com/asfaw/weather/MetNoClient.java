package com.asfaw.weather;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
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
import java.time.format.DateTimeFormatter;

@Component
public class MetNoClient implements WeatherClient {
    private static final String BASE_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";

    private final RestTemplate restTemplate;

    public MetNoClient(
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
                .queryParam("lat", latitude)
                .queryParam("lon", longitude)
                .build(true)
                .toUri();

        JsonNode root = fetchJson(uri);
        JsonNode timeseries = root.path("properties").path("timeseries");

        if (!timeseries.isArray() || timeseries.isEmpty()) {
            throw new WeatherProviderException("Met.no timeseries is empty");
        }

        JsonNode currentData = timeseries.get(0);
        String symbolCode = currentData.path("data").path("next_1_hours").path("summary").path("symbol_code").asText("");
        if (symbolCode.isBlank()) {
            symbolCode = currentData.path("data").path("next_6_hours").path("summary").path("symbol_code").asText("");
        }

        return mapMetNoSymbol(symbolCode);
    }

    public WeatherSnapshot fetchFutureNearest(double latitude, double longitude, Instant targetTime) {
        URI uri = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                .queryParam("lat", latitude)
                .queryParam("lon", longitude)
                .build(true)
                .toUri();

        JsonNode root = fetchJson(uri);
        JsonNode timeseries = root.path("properties").path("timeseries");

        if (!timeseries.isArray() || timeseries.isEmpty()) {
            return buildSnapshot(latitude, longitude, Instant.now(), 0.0, -1);
        }

        int bestIndex = 0;
        long bestDiff = Long.MAX_VALUE;

        for (int i = 0; i < timeseries.size(); i++) {
            String timeText = timeseries.get(i).path("time").asText("");
            Instant pointTime = parseUtcIso(timeText);
            long diff = Math.abs(pointTime.toEpochMilli() - targetTime.toEpochMilli());
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIndex = i;
            }
        }

        JsonNode bestData = timeseries.get(bestIndex);
        String symbolCode = bestData.path("data").path("next_1_hours").path("summary").path("symbol_code").asText("");
        if (symbolCode.isBlank()) {
            symbolCode = bestData.path("data").path("next_6_hours").path("summary").path("symbol_code").asText("");
        }

        return mapMetNoSymbol(symbolCode);
    }

    private JsonNode fetchJson(URI uri) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "SkyPathWeather/1.0");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(uri, HttpMethod.GET, entity, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null) {
                throw new WeatherProviderException("Met.no response body is empty");
            }
            return body;
        } catch (HttpStatusCodeException ex) {
            int statusCode = ex.getStatusCode().value();
            if (statusCode == 429) {
                throw new WeatherProviderException("Met.no rate limit reached.", ex);
            }
            if (statusCode >= 500) {
                throw new WeatherProviderException("Met.no is currently unavailable.", ex);
            }
            throw new WeatherProviderException("Met.no rejected weather request.", ex);
        } catch (RestClientException ex) {
            throw new WeatherProviderException("Met.no request failed", ex);
        }
    }

    private Instant parseUtcIso(String timeText) {
        if (timeText == null || timeText.isBlank()) {
            return Instant.EPOCH;
        }
        try {
            return Instant.parse(timeText);
        } catch (Exception ex) {
            try {
                LocalDateTime localDateTime = LocalDateTime.parse(timeText, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                return localDateTime.toInstant(ZoneOffset.UTC);
            } catch (Exception ignored) {
                return Instant.EPOCH;
            }
        }
    }

    private WeatherSnapshot mapMetNoSymbol(double latitude, double longitude, String symbolCode) {
        if (symbolCode == null || symbolCode.isBlank()) {
            return buildSnapshot(latitude, longitude, Instant.now(), 0.0, -1);
        }

        String cleanSymbol = symbolCode.toLowerCase().split("_")[0];

        double probability = 0.0;
        int weatherCode = -1;

        if (cleanSymbol.contains("rain") || cleanSymbol.contains("sleet") || cleanSymbol.contains("drizzle")) {
            weatherCode = 61; // rain
            probability = 80.0;
        } else if (cleanSymbol.contains("snow") || cleanSymbol.contains("snowshowers")) {
            weatherCode = 71; // snow
            probability = 80.0;
        } else if (cleanSymbol.contains("fog")) {
            weatherCode = 45; // fog
            probability = 0.0;
        } else if (cleanSymbol.contains("cloud")) {
            weatherCode = 3; // partly cloudy
            probability = 0.0;
        } else if (cleanSymbol.contains("clear") || cleanSymbol.contains("fair") || cleanSymbol.contains("sun")) {
            weatherCode = 0; // clear
            probability = 0.0;
        } else {
            weatherCode = 0;
            probability = 0.0;
        }

        return buildSnapshot(latitude, longitude, Instant.now(), probability, weatherCode);
    }

    private WeatherSnapshot buildSnapshot(double latitude, double longitude, Instant timestamp, double precipitationProbability, int weatherCode) {
        String condition = mapWeatherCodeToCondition(weatherCode);
        double temperature = 24.0;
        double windSpeed = 8.0;
        String weatherIcon = mapWeatherCodeToIcon(weatherCode);
        return new WeatherSnapshot(
                latitude,
                longitude,
                timestamp,
                condition,
                temperature,
                windSpeed,
                precipitationProbability,
                weatherIcon
        );
    }

    private String mapWeatherCodeToCondition(int weatherCode) {
        return switch (weatherCode) {
            case 0 -> "Clear";
            case 1, 2, 3 -> "Partly cloudy";
            case 45, 48 -> "Fog";
            case 51, 53, 55, 61, 63, 65, 80, 81, 82 -> "Rain";
            case 71, 73, 75, 77 -> "Snow";
            default -> "Clear";
        };
    }

    private String mapWeatherCodeToIcon(int weatherCode) {
        return switch (weatherCode) {
            case 0 -> "☀️";
            case 1, 2, 3 -> "⛅";
            case 45, 48 -> "🌫️";
            case 51, 53, 55, 61, 63, 65, 80, 81, 82 -> "🌧️";
            case 71, 73, 75, 77 -> "❄️";
            default -> "☀️";
        };
    }
}
