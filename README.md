# SkyPath: Personal Weather Pathfinder

SkyPath is a single-page app served by Spring Boot that projects your near-future path and checks weather risk on that route.

## Features
- Dark Tailwind dashboard with Leaflet dark map
- High-accuracy geolocation tracking via `watchPosition`
- 15/30/60 minute projected coordinates from speed + heading
- Open-Meteo current and hourly forecast integration
- Weather mapping: clear, partly cloudy, fog, rain, snow
- Vibe check warning for rain/snow/fog risk over 40%
- In-memory browser cache for forecast requests (30s TTL)
- Manual location fallback when geolocation is denied/unavailable

## Project Structure
- `src/main/java/com/asfaw/Main.java` - Spring Boot entry point
- `src/main/resources/static/index.html` - app layout
- `src/main/resources/static/styles.css` - marker + warning animations
- `src/main/resources/static/app.js` - geolocation, projection, API calls, UI updates

## Run
```bash
mvn spring-boot:run
```

Open `http://localhost:8080` in your browser.

## Notes
- Geolocation usually requires `https` or `localhost`.
- If heading is unavailable in manual mode, the app prompts for heading before projecting future points.

