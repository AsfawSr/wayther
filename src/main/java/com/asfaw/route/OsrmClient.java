package com.asfaw.route;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Component
public class OsrmClient {
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
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
                throw new RouteProviderException("OSRM response body is empty");
            }
            return body;
        } catch (HttpClientErrorException.BadRequest ex) {
            String responseBody = ex.getResponseBodyAsString();
            if (responseBody != null && responseBody.contains("\"code\":\"NoRoute\"")) {
                throw new RouteNotFoundException("No drivable route found between origin and destination.");
            }
            throw new RouteProviderException("OSRM rejected route request: " + extractOsrmMessage(responseBody), ex);
        } catch (RestClientException ex) {
            throw new RouteProviderException("OSRM request failed", ex);
        }
    }

    private String extractOsrmMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "unknown error";
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            if (node.has("message")) {
                return node.get("message").asText();
            }
        } catch (Exception ignored) {
            // Keep fallback behavior if OSRM body is not valid JSON.
        }
        return responseBody;
    }
}

