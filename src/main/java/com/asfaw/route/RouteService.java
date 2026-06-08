package com.asfaw.route;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RouteService {
    private final OsrmClient osrmClient;
    private final long cacheTtlMs;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public RouteService(
            OsrmClient osrmClient,
            @Value("${wayther.osrm.cache-ttl-ms:30000}") long cacheTtlMs
    ) {
        this.osrmClient = osrmClient;
        this.cacheTtlMs = cacheTtlMs;
    }

    public OsrmRouteResponse getRoute(String profile, double originLat, double originLon, double destLat, double destLon) {
        String safeProfile = (profile != null) ? profile : "driving";
        String key = "route:%s:%s:%s:%s:%s".formatted(
                safeProfile,
                roundCoord(originLat),
                roundCoord(originLon),
                roundCoord(destLat),
                roundCoord(destLon)
        );

        long now = System.currentTimeMillis();
        CacheEntry existing = cache.get(key);
        if (existing != null && existing.expiresAtMillis > now) {
            return existing.response;
        }

        OsrmRouteResponse response = osrmClient.fetchRoute(safeProfile, originLat, originLon, destLat, destLon);
        cache.put(key, new CacheEntry(response, now + cacheTtlMs));
        return response;
    }

    private String roundCoord(double value) {
        return String.format("%.4f", value);
    }

    private record CacheEntry(OsrmRouteResponse response, long expiresAtMillis) {
    }
}
