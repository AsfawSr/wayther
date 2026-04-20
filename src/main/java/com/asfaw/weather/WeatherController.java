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
        coverageService.requireInsideAddis(latitude, longitude, "Current weather point");
        return weatherService.getCurrent(latitude, longitude);
    }

    @GetMapping("/future")
    public WeatherSnapshot future(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant targetIso
    ) {
        coverageService.requireInsideAddis(latitude, longitude, "Future weather point");
        return weatherService.getFuture(latitude, longitude, targetIso);
    }

    @PostMapping("/future/batch")
    public List<WeatherSnapshot> futureBatch(@RequestBody List<FutureWeatherCheckpoint> checkpoints) {
        for (int i = 0; i < checkpoints.size(); i++) {
            FutureWeatherCheckpoint checkpoint = checkpoints.get(i);
            coverageService.requireInsideAddis(
                    checkpoint.latitude(),
                    checkpoint.longitude(),
                    "Future weather checkpoint #%d".formatted(i + 1)
            );
        }
        return weatherService.getFutureBatch(checkpoints);
    }
}

