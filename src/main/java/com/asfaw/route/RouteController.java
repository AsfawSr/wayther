package com.asfaw.route;

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
    public OsrmRouteResponse route(
            @RequestParam(defaultValue = "driving") String profile,
            @RequestParam double originLat,
            @RequestParam double originLon,
            @RequestParam double destLat,
            @RequestParam double destLon
    ) {
        coverageService.requireInsideAddis(originLat, originLon, "Origin");
        coverageService.requireInsideAddis(destLat, destLon, "Destination");
        return routeService.getRoute(profile, originLat, originLon, destLat, destLon);
    }
}
