package com.asfaw.weather;

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

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/current")
    public WeatherSnapshot current(
            @RequestParam double latitude,
            @RequestParam double longitude
    ) {
        return weatherService.getCurrent(latitude, longitude);
    }

    @GetMapping("/future")
    public WeatherSnapshot future(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant targetIso
    ) {
        return weatherService.getFuture(latitude, longitude, targetIso);
    }

    @PostMapping("/future/batch")
    public List<WeatherSnapshot> futureBatch(@RequestBody List<FutureWeatherCheckpoint> checkpoints) {
        return weatherService.getFutureBatch(checkpoints);
    }
}

