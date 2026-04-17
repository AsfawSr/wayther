package com.asfaw.weather;

import java.time.Instant;

public record FutureWeatherCheckpoint(
        double latitude,
        double longitude,
        Instant targetIso
) {
}

