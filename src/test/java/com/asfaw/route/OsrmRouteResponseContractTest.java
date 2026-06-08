package com.asfaw.route;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OsrmRouteResponseContractTest {

    @Test
    void serializesToFrontendExpectedShape() {
        OsrmRouteResponse response = new OsrmRouteResponse(
                "Ok",
                List.of(new OsrmRouteResponse.OsrmRoute(
                        new OsrmRouteResponse.OsrmGeometry(
                                "LineString",
                                List.of(
                                        List.of(38.74, 9.03),
                                        List.of(38.75, 9.04)
                                )
                        ),
                        612.5,
                        4200.0
                ))
        );

        JsonNode json = new ObjectMapper().valueToTree(response);

        assertEquals("Ok", json.path("code").asText());
        assertEquals(612.5, json.path("routes").get(0).path("duration").asDouble());
        assertEquals(4200.0, json.path("routes").get(0).path("distance").asDouble());
        assertEquals(38.74, json.path("routes").get(0).path("geometry").path("coordinates").get(0).get(0).asDouble());
        assertEquals(9.03, json.path("routes").get(0).path("geometry").path("coordinates").get(0).get(1).asDouble());
    }
}

