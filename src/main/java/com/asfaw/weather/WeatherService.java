package com.asfaw.weather;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WeatherService {
    private static final long CACHE_TTL_MS = 30_000;

    private final OpenMeteoClient openMeteoClient;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public WeatherService(OpenMeteoClient openMeteoClient) {
        this.openMeteoClient = openMeteoClient;
    }

    public WeatherSnapshot getCurrent(double latitude, double longitude) {
        String key = "current:%s:%s".formatted(roundCoord(latitude), roundCoord(longitude));
        return getOrLoad(key, () -> openMeteoClient.fetchCurrent(latitude, longitude));
    }

    public WeatherSnapshot getFuture(double latitude, double longitude, Instant targetTime) {
        Instant hourBucket = targetTime.truncatedTo(ChronoUnit.HOURS);
        String key = "future:%s:%s:%s".formatted(
                roundCoord(latitude),
                roundCoord(longitude),
                hourBucket.toString()
        );
        return getOrLoad(key, () -> openMeteoClient.fetchFutureNearest(latitude, longitude, targetTime));
    }

    private WeatherSnapshot getOrLoad(String key, Loader loader) {
        long now = System.currentTimeMillis();
        CacheEntry existing = cache.get(key);
        if (existing != null && existing.expiresAtMillis > now) {
            return existing.snapshot;
        }

        WeatherSnapshot snapshot = loader.load();
        cache.put(key, new CacheEntry(snapshot, now + CACHE_TTL_MS));
        return snapshot;
    }

    private String roundCoord(double value) {
        return String.format("%.3f", value);
    }

    @FunctionalInterface
    private interface Loader {
        WeatherSnapshot load();
    }

    private record CacheEntry(WeatherSnapshot snapshot, long expiresAtMillis) {
    }
}

