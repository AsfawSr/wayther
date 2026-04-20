package com.asfaw.route;

import com.asfaw.geo.CoverageAreaException;
import com.asfaw.weather.WeatherProviderException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RouteExceptionHandlerTest {

    private final RouteExceptionHandler handler = new RouteExceptionHandler();

    @Test
    void handleRouteNotFound_returns422() {
        ResponseEntity<RouteExceptionHandler.RouteErrorResponse> response =
                handler.handleRouteNotFound(new RouteNotFoundException("No route"));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertEquals("NO_ROUTE", response.getBody().code());
    }

    @Test
    void handleCoverage_returns422() {
        ResponseEntity<RouteExceptionHandler.RouteErrorResponse> response =
                handler.handleCoverageError(new CoverageAreaException("Outside Addis"));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertEquals("OUT_OF_COVERAGE", response.getBody().code());
    }

    @Test
    void handleRouteProvider_returns502() {
        ResponseEntity<RouteExceptionHandler.RouteErrorResponse> response =
                handler.handleRouteProviderError(new RouteProviderException("OSRM failed"));

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals("ROUTE_PROVIDER_ERROR", response.getBody().code());
    }

    @Test
    void handleWeatherProvider_returns502() {
        ResponseEntity<RouteExceptionHandler.RouteErrorResponse> response =
                handler.handleWeatherProviderError(new WeatherProviderException("Open-Meteo failed"));

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals("WEATHER_PROVIDER_ERROR", response.getBody().code());
    }

    @Test
    void handleBadRequest_returns400() {
        ResponseEntity<RouteExceptionHandler.RouteErrorResponse> response =
                handler.handleBadRequest(new IllegalArgumentException("Invalid request"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("INVALID_REQUEST", response.getBody().code());
    }
}

