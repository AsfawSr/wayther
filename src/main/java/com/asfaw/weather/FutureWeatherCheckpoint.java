package com.asfaw.weather;

import java.time.Instant;

public record FutureWeatherCheckpoint(
        double latitude,
        double longitude,
        Instant targetIso
) {
    public FutureWeatherCheckpoint {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new IllegalArgumentException("Checkpoint latitude must be between -90 and 90.");
        }
        if (!Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Checkpoint longitude must be between -180 and 180.");
        }
        if (targetIso == null) {
            throw new IllegalArgumentException("Checkpoint targetIso is required.");
        }
    }
}

