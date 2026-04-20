package com.asfaw.geo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AddisCoverageService {
    private final double minLat;
    private final double maxLat;
    private final double minLon;
    private final double maxLon;

    public AddisCoverageService(
            @Value("${wayther.coverage.addis.min-lat:8.80}") double minLat,
            @Value("${wayther.coverage.addis.max-lat:9.20}") double maxLat,
            @Value("${wayther.coverage.addis.min-lon:38.60}") double minLon,
            @Value("${wayther.coverage.addis.max-lon:39.05}") double maxLon
    ) {
        this.minLat = minLat;
        this.maxLat = maxLat;
        this.minLon = minLon;
        this.maxLon = maxLon;
    }

    public boolean isInsideAddis(double lat, double lon) {
        return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
    }

    public void requireInsideAddis(double lat, double lon, String pointName) {
        if (!isInsideAddis(lat, lon)) {
            throw new CoverageAreaException(pointName + " is outside Addis coverage area.");
        }
    }
}

