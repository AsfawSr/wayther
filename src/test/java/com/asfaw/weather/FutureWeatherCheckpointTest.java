package com.asfaw.weather;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FutureWeatherCheckpointTest {

    @Test
    void constructor_rejectsMissingTargetIso() {
        assertThrows(IllegalArgumentException.class, () ->
                new FutureWeatherCheckpoint(9.01, 38.74, null)
        );
    }

    @Test
    void constructor_rejectsOutOfRangeCoordinates() {
        assertThrows(IllegalArgumentException.class, () ->
                new FutureWeatherCheckpoint(120.0, 38.74, Instant.parse("2026-04-20T12:00:00Z"))
        );

        assertThrows(IllegalArgumentException.class, () ->
                new FutureWeatherCheckpoint(9.01, -200.0, Instant.parse("2026-04-20T12:00:00Z"))
        );
    }

    @Test
    void constructor_acceptsValidCheckpoint() {
        assertDoesNotThrow(() ->
                new FutureWeatherCheckpoint(9.01, 38.74, Instant.parse("2026-04-20T12:00:00Z"))
        );
    }
}

