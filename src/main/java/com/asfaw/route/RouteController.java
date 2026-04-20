package com.asfaw.route;

import com.fasterxml.jackson.databind.JsonNode;
import com.asfaw.geo.AddisCoverageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RouteController {
    private final RouteService routeService;
    private final AddisCoverageService coverageService;

    public RouteController(RouteService routeService, AddisCoverageService coverageService) {
        this.routeService = routeService;
        this.coverageService = coverageService;
    }

    @GetMapping("/route")
    public JsonNode route(
            @RequestParam double originLat,
            @RequestParam double originLon,
            @RequestParam double destLat,
            @RequestParam double destLon
    ) {
        coverageService.requireInsideAddis(originLat, originLon, "Origin");
        coverageService.requireInsideAddis(destLat, destLon, "Destination");
        return routeService.getRoute(originLat, originLon, destLat, destLon);
    }
}

