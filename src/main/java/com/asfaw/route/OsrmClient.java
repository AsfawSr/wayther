package com.asfaw.route;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Component
public class OsrmClient {
    private final RestTemplate restTemplate = new RestTemplate();
    private final String osrmBaseUrl;

    public OsrmClient(@Value("${wayther.osrm.base-url:https://router.project-osrm.org}") String osrmBaseUrl) {
        this.osrmBaseUrl = osrmBaseUrl;
    }

    public JsonNode fetchRoute(double originLat, double originLon, double destLat, double destLon) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(osrmBaseUrl)
                .path("/route/v1/driving/{originLon},{originLat};{destLon},{destLat}")
                .queryParam("overview", "full")
                .queryParam("geometries", "geojson")
                .buildAndExpand(originLon, originLat, destLon, destLat)
                .toUri();

        try {
            JsonNode body = restTemplate.getForObject(uri, JsonNode.class);
            if (body == null) {
                throw new IllegalStateException("OSRM response body is empty");
            }
            return body;
        } catch (RestClientException ex) {
            throw new IllegalStateException("OSRM request failed", ex);
        }
    }
}

