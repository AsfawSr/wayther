package com.asfaw.route;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OsrmRouteResponse(
        @JsonProperty("code") String code,
        @JsonProperty("routes") List<OsrmRoute> routes
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OsrmRoute(
            @JsonProperty("geometry") OsrmGeometry geometry,
            @JsonProperty("duration") double duration,
            @JsonProperty("distance") double distance
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OsrmGeometry(
            @JsonProperty("type") String type,
            @JsonProperty("coordinates") List<List<Double>> coordinates
    ) {
    }
}

