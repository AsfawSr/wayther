package com.asfaw.route;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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

    public record RouteErrorResponse(String code, String message) {
    }
}

