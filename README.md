# SkyPath: Personal Weather Pathfinder

SkyPath is a single-page app served by Spring Boot that projects your near-future path and checks weather risk on that route.

## Features
- Dark Tailwind dashboard with Leaflet dark map
- High-accuracy geolocation tracking via `watchPosition`
- 15/30/60 minute projected coordinates from speed + heading
- Destination-based route forecasting using OSRM with route ETA checkpoints (15/30/60 min)
- From->To planning mode with optional explicit origin coordinates
- Backend weather proxy endpoints: `GET /api/weather/current`, `GET /api/weather/future`, and `POST /api/weather/future/batch`
- Backend route proxy endpoint: `GET /api/route`
- Weather mapping: clear, partly cloudy, fog, rain, snow
- Vibe check warning for rain/snow/fog risk over 40%
- In-memory server cache for forecast requests (30s TTL)
- Batched 15/30/60 future checkpoint weather lookups in one request
- Retry geolocation plus From->To route planning fallback when geolocation is denied/unavailable

## Project Structure
- `src/main/java/com/asfaw/Main.java` - Spring Boot entry point
- `src/main/java/com/asfaw/weather/WeatherController.java` - backend weather API endpoints
- `src/main/java/com/asfaw/weather/WeatherService.java` - cache + orchestration
- `src/main/java/com/asfaw/weather/OpenMeteoClient.java` - Open-Meteo integration
- `src/main/java/com/asfaw/weather/FutureWeatherCheckpoint.java` - batch checkpoint request model
- `src/main/java/com/asfaw/route/RouteController.java` - backend route API endpoint
- `src/main/java/com/asfaw/route/RouteService.java` - OSRM route cache + orchestration
- `src/main/java/com/asfaw/route/OsrmClient.java` - OSRM integration
- `src/main/resources/static/index.html` - app layout
- `src/main/resources/static/styles.css` - marker + warning animations
- `src/main/resources/static/app.js` - geolocation, projection, backend API calls, UI updates

## Run
```bash
mvn spring-boot:run
```

Open `http://localhost:8080` in your browser.

## Notes
- Geolocation usually requires `https` or `localhost`.
- If geolocation is unavailable, you can still plan forecasts by entering origin and destination coordinates.
- You can click the map to prefill destination coordinates, then use `Plan Route`.
- Use the "Map click fills" selector to choose whether clicks set destination or origin coordinates.
- If origin is left blank, the app uses your current/live manual location as the route start.
- OSRM calls are proxied through `/api/route`; if route fetch fails, the app falls back to heading-based forecasting.

