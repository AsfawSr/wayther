package com.asfaw.weather;

import java.time.Instant;

public interface WeatherClient {
    WeatherSnapshot fetchCurrent(double latitude, double longitude);
    WeatherSnapshot fetchFutureNearest(double latitude, double longitude, Instant targetTime);
}
