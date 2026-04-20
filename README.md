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

## MVP Ship Checklist
- [ ] `mvn test` passes locally
- [ ] App starts with `mvn spring-boot:run`
- [ ] Geolocation flow works on `https` or `localhost`
- [ ] Manual origin/destination fallback works when geolocation is denied
- [ ] Route request succeeds for Addis-covered points (`GET /api/route`)
- [ ] Weather current/future/batch endpoints return valid JSON
- [ ] Out-of-coverage requests return `422` with `{ "code": "OUT_OF_COVERAGE", "message": "..." }`
- [ ] Upstream provider failures return `502` with stable error codes for UI handling

## Environment and Config
Key properties in `src/main/resources/application.properties`:

- `wayther.osrm.base-url` - OSRM base URL
- `wayther.osrm.cache-ttl-ms` - route cache TTL
- `wayther.osrm.connect-timeout-ms` - OSRM connect timeout
- `wayther.osrm.read-timeout-ms` - OSRM read timeout
- `wayther.weather.cache-ttl-ms` - weather cache TTL
- `wayther.weather.connect-timeout-ms` - Open-Meteo connect timeout
- `wayther.weather.read-timeout-ms` - Open-Meteo read timeout
- `wayther.coverage.addis.min-lat`
- `wayther.coverage.addis.max-lat`
- `wayther.coverage.addis.min-lon`
- `wayther.coverage.addis.max-lon`

## API Smoke Tests (PowerShell)
Run app first, then test from another terminal.

```powershell
$base = "http://localhost:8080"

# Current weather
Invoke-RestMethod "$base/api/weather/current?latitude=9.03&longitude=38.74"

# Future weather
Invoke-RestMethod "$base/api/weather/future?latitude=9.03&longitude=38.74&targetIso=2026-04-20T18:00:00Z"

# Future weather batch
$body = @(
  @{ latitude = 9.03; longitude = 38.74; targetIso = "2026-04-20T18:00:00Z" },
  @{ latitude = 9.04; longitude = 38.75; targetIso = "2026-04-20T18:30:00Z" }
) | ConvertTo-Json
Invoke-RestMethod -Uri "$base/api/weather/future/batch" -Method Post -ContentType "application/json" -Body $body

# Route
Invoke-RestMethod "$base/api/route?originLat=9.03&originLon=38.74&destLat=9.08&destLon=38.79"

# Expected coverage error (422)
try {
  Invoke-RestMethod "$base/api/weather/current?latitude=8.20&longitude=38.74"
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

## Notes
- Geolocation usually requires `https` or `localhost`.
- If geolocation is unavailable, you can still plan forecasts by entering origin and destination coordinates.
- You can click the map to prefill destination coordinates, then use `Plan Route`.
- Use the "Map click fills" selector to choose whether clicks set destination or origin coordinates.
- If origin is left blank, the app uses your current/live manual location as the route start.
- OSRM calls are proxied through `/api/route`; if route fetch fails, the app falls back to heading-based forecasting.

