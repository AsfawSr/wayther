package com.asfaw.weather;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WeatherServiceTest {

    @Test
    void getCurrent_usesCacheWithinTtl() {
        OpenMeteoClient client = mock(OpenMeteoClient.class);
        WeatherSnapshot snapshot = new WeatherSnapshot(12.0, 1);
        when(client.fetchCurrent(9.02, 38.75)).thenReturn(snapshot);

        WeatherService service = new WeatherService(client, 10_000);

        WeatherSnapshot first = service.getCurrent(9.02, 38.75);
        WeatherSnapshot second = service.getCurrent(9.02, 38.75);

        assertEquals(snapshot, first);
        assertEquals(snapshot, second);
        verify(client, times(1)).fetchCurrent(9.02, 38.75);
    }

    @Test
    void getFuture_usesHourBucketCacheKey() {
        OpenMeteoClient client = mock(OpenMeteoClient.class);
        WeatherSnapshot snapshot = new WeatherSnapshot(45.0, 61);
        Instant firstTarget = Instant.parse("2026-04-20T10:05:00Z");
        Instant secondTarget = Instant.parse("2026-04-20T10:50:00Z");

        when(client.fetchFutureNearest(9.02, 38.75, firstTarget)).thenReturn(snapshot);

        WeatherService service = new WeatherService(client, 10_000);

        WeatherSnapshot first = service.getFuture(9.02, 38.75, firstTarget);
        WeatherSnapshot second = service.getFuture(9.02, 38.75, secondTarget);

        assertEquals(snapshot, first);
        assertEquals(snapshot, second);
        verify(client, times(1)).fetchFutureNearest(9.02, 38.75, firstTarget);
    }

    @Test
    void getCurrent_reloadsAfterTtlExpires() throws InterruptedException {
        OpenMeteoClient client = mock(OpenMeteoClient.class);
        WeatherSnapshot snapshot = new WeatherSnapshot(5.0, 0);
        when(client.fetchCurrent(9.04, 38.77)).thenReturn(snapshot);

        WeatherService service = new WeatherService(client, 5);

        service.getCurrent(9.04, 38.77);
        Thread.sleep(20);
        service.getCurrent(9.04, 38.77);

        verify(client, times(2)).fetchCurrent(9.04, 38.77);
    }
}

