package com.asfaw.weather;

import com.asfaw.geo.AddisCoverageService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {
    private final WeatherService weatherService;
    private final AddisCoverageService coverageService;

    public WeatherController(WeatherService weatherService, AddisCoverageService coverageService) {
        this.weatherService = weatherService;
        this.coverageService = coverageService;
    }

    @GetMapping("/current")
    public WeatherSnapshot current(
            @RequestParam double latitude,
            @RequestParam double longitude
    ) {
        validateCoordinates(latitude, longitude, "Current weather point");
        coverageService.requireInsideAddis(latitude, longitude, "Current weather point");
        return weatherService.getCurrent(latitude, longitude);
    }

    @GetMapping("/future")
    public WeatherSnapshot future(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant targetIso
    ) {
        validateCoordinates(latitude, longitude, "Future weather point");
        if (targetIso == null) {
            throw new IllegalArgumentException("targetIso is required.");
        }
        coverageService.requireInsideAddis(latitude, longitude, "Future weather point");
        return weatherService.getFuture(latitude, longitude, targetIso);
    }

    @PostMapping("/future/batch")
    public List<WeatherSnapshot> futureBatch(@RequestBody List<FutureWeatherCheckpoint> checkpoints) {
        if (checkpoints == null || checkpoints.isEmpty()) {
            throw new IllegalArgumentException("At least one future checkpoint is required.");
        }

        for (int i = 0; i < checkpoints.size(); i++) {
            FutureWeatherCheckpoint checkpoint = checkpoints.get(i);
            if (checkpoint == null) {
                throw new IllegalArgumentException("Future weather checkpoint #%d is missing.".formatted(i + 1));
            }

            validateCoordinates(
                    checkpoint.latitude(),
                    checkpoint.longitude(),
                    "Future weather checkpoint #%d".formatted(i + 1)
            );
            coverageService.requireInsideAddis(
                    checkpoint.latitude(),
                    checkpoint.longitude(),
                    "Future weather checkpoint #%d".formatted(i + 1)
            );
        }
        return weatherService.getFutureBatch(checkpoints);
    }

    private void validateCoordinates(double latitude, double longitude, String pointName) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new IllegalArgumentException(pointName + " latitude must be between -90 and 90.");
        }
        if (!Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException(pointName + " longitude must be between -180 and 180.");
        }
    }
}

