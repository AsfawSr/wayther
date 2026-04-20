package com.asfaw.route;

public class RouteProviderException extends RuntimeException {
    public RouteProviderException(String message) {
        super(message);
    }

    public RouteProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}

