package com.asfaw.route;

import com.asfaw.geo.CoverageAreaException;
import com.asfaw.weather.WeatherProviderException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class RouteExceptionHandler {
    @ExceptionHandler(RouteNotFoundException.class)
    public ResponseEntity<RouteErrorResponse> handleRouteNotFound(RouteNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new RouteErrorResponse("NO_ROUTE", ex.getMessage()));
    }

    @ExceptionHandler(RouteProviderException.class)
    public ResponseEntity<RouteErrorResponse> handleRouteProviderError(RouteProviderException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new RouteErrorResponse("ROUTE_PROVIDER_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(WeatherProviderException.class)
    public ResponseEntity<RouteErrorResponse> handleWeatherProviderError(WeatherProviderException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new RouteErrorResponse("WEATHER_PROVIDER_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<RouteErrorResponse> handleUpstreamStateError(IllegalStateException ex) {
        if (isUpstreamFailure(ex.getMessage())) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new RouteErrorResponse("UPSTREAM_ERROR", ex.getMessage()));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new RouteErrorResponse("INTERNAL_ERROR", "Unexpected server error."));
    }

    @ExceptionHandler(CoverageAreaException.class)
    public ResponseEntity<RouteErrorResponse> handleCoverageError(CoverageAreaException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new RouteErrorResponse("OUT_OF_COVERAGE", ex.getMessage()));
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<RouteErrorResponse> handleBadRequest(Exception ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new RouteErrorResponse("INVALID_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<RouteErrorResponse> handleUnexpectedError(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new RouteErrorResponse("INTERNAL_ERROR", "Unexpected server error."));
    }

    private boolean isUpstreamFailure(String message) {
        if (message == null) {
            return false;
        }
        return message.startsWith("Open-Meteo") || message.startsWith("OSRM");
    }

    public record RouteErrorResponse(String code, String message) {
    }
}

