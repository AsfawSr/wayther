const FUTURE_MINUTES = [15, 30, 60];
const UPDATE_INTERVAL_MS = 3000;
const SPEED_DELTA_MS = 0.5;
const HEADING_DELTA_DEG = 10;
const ROUTE_REFRESH_MS = 60000;
const ROUTE_ORIGIN_REFRESH_METERS = 200;

const state = {
  map: null,
  currentMarker: null,
  futureMarkers: [],
  routeBaseLayer: null,
  routeRiskLayers: [],
  inFlight: false,
  manualMode: false,
  watchId: null,
  intervalId: null,
  last: { speedMs: null, heading: null },
  current: {
    lat: null,
    lon: null,
    speedMs: 0,
    heading: null
  },
  route: {
    destination: null,
    geometry: [],
    cumulativeDistancesM: [],
    totalDistanceM: 0,
    totalDurationSec: 0,
    originAtFetch: null,
    lastFetchedAt: 0
  }
};

const el = {
  speedKmh: document.getElementById("speedKmh"),
  speedMs: document.getElementById("speedMs"),
  headingText: document.getElementById("headingText"),
  statusText: document.getElementById("statusText"),
  routeStatus: document.getElementById("routeStatus"),
  timeline: document.getElementById("timeline"),
  vibeCheck: document.getElementById("vibeCheck"),
  manualSection: document.getElementById("manualSection"),
  manualHint: document.getElementById("manualHint"),
  manualForm: document.getElementById("manualForm"),
  retryGeoBtn: document.getElementById("retryGeoBtn"),
  destinationForm: document.getElementById("destinationForm"),
  clearRouteBtn: document.getElementById("clearRouteBtn"),
  destLat: document.getElementById("destLat"),
  destLon: document.getElementById("destLon"),
  manualLat: document.getElementById("manualLat"),
  manualLon: document.getElementById("manualLon"),
  manualSpeed: document.getElementById("manualSpeed"),
  manualHeading: document.getElementById("manualHeading")
};

init();

function init() {
  initMap();
  bindManualForm();
  bindRetryGeolocation();
  bindDestinationForm();
  startGeoWatch();
  startScheduledUpdates();
}

function initMap() {
  state.map = L.map("map").setView([9.03, 38.74], 11);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19
  }).addTo(state.map);

  state.map.on("click", (event) => {
    el.destLat.value = event.latlng.lat.toFixed(6);
    el.destLon.value = event.latlng.lng.toFixed(6);
    setRouteStatus("Destination selected from map. Click Plan Route to update route forecast.");
  });
}

function bindRetryGeolocation() {
  el.retryGeoBtn.addEventListener("click", () => {
    state.manualMode = false;
    hideManualHint();
    setStatus("Retrying geolocation...");
    startGeoWatch();
  });
}

function bindDestinationForm() {
  el.destinationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const destLat = Number(el.destLat.value);
    const destLon = Number(el.destLon.value);

    if (!Number.isFinite(destLat) || !Number.isFinite(destLon)) {
      setRouteStatus("Please enter a valid destination latitude and longitude.");
      return;
    }

    state.route.destination = { lat: destLat, lon: destLon };
    setRouteStatus("Planning route...");

    const ok = await planRouteFromCurrentLocation(true);
    if (ok) {
      await updateEverything();
    }
  });

  el.clearRouteBtn.addEventListener("click", () => {
    clearRoutePlan();
    setRouteStatus("Route cleared. Forecast falls back to heading projection.");
    updateEverything();
  });
}

function bindManualForm() {
  el.manualForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const lat = Number(el.manualLat.value);
    const lon = Number(el.manualLon.value);
    const speedKmh = Number(el.manualSpeed.value || 0);
    const headingRaw = el.manualHeading.value;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setStatus("Please enter valid latitude and longitude.");
      return;
    }

    state.manualMode = true;
    state.current.lat = lat;
    state.current.lon = lon;
    state.current.speedMs = Math.max(0, speedKmh / 3.6);

    if (headingRaw === "") {
      state.current.heading = null;
      showManualHint("Heading missing: add heading to enable future path projections.");
    } else {
      state.current.heading = normalizeHeading(Number(headingRaw));
      hideManualHint();
    }

    renderLiveStatus();
    updateCurrentMarker();
    await updateEverything();
    setStatus("Manual location updated.");
  });
}

function startGeoWatch() {
  if (!("geolocation" in navigator)) {
    enableManualMode("Geolocation is not supported by this browser.");
    return;
  }

  if (state.watchId != null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }

  state.watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
}

function onPosition(position) {
  if (state.manualMode) {
    return;
  }

  el.manualSection.classList.add("hidden");

  const coords = position.coords;
  state.current.lat = coords.latitude;
  state.current.lon = coords.longitude;
  state.current.speedMs = Number.isFinite(coords.speed) ? Math.max(0, coords.speed) : 0;

  if (Number.isFinite(coords.heading)) {
    state.current.heading = normalizeHeading(coords.heading);
  } else {
    state.current.heading = state.last.heading;
  }

  renderLiveStatus();
  updateCurrentMarker();

  const speedChanged = hasSignificantSpeedChange(state.current.speedMs, state.last.speedMs);
  const headingChanged = hasSignificantHeadingChange(state.current.heading, state.last.heading);

  if (speedChanged || headingChanged) {
    updateEverything();
  }

  state.last.speedMs = state.current.speedMs;
  state.last.heading = state.current.heading;
}

function onPositionError(error) {
  if (error && error.code === 1) {
    enableManualMode("Geolocation denied. Use manual location input.");
    return;
  }
  enableManualMode("Geolocation unavailable. Use manual location input.");
}

function enableManualMode(message) {
  el.manualSection.classList.remove("hidden");
  setStatus(message);
}

function startScheduledUpdates() {
  state.intervalId = setInterval(() => {
    if (state.current.lat == null || state.current.lon == null) {
      return;
    }
    updateEverything();
  }, UPDATE_INTERVAL_MS);
}

async function updateEverything() {
  if (state.inFlight) {
    return;
  }
  if (state.current.lat == null || state.current.lon == null) {
    return;
  }

  state.inFlight = true;
  setStatus("Refreshing weather path...");

  try {
    const current = await fetchCurrentWeather(state.current.lat, state.current.lon);

    let predictions = [];
    let usedRoute = false;

    if (state.route.destination) {
      predictions = await buildRoutePredictionsIfPossible();
      usedRoute = predictions.length > 0;
    }

    if (!predictions.length) {
      if (state.current.heading == null) {
        if (state.manualMode) {
          showManualHint("Heading missing: add heading to project 15/30/60 minute path.");
        }
      } else {
        hideManualHint();
        predictions = await Promise.all(FUTURE_MINUTES.map((minutes) => buildHeadingPrediction(minutes)));
      }
    } else {
      hideManualHint();
    }

    renderTimeline(current, predictions);
    renderFutureMarkers(predictions);
    renderVibeCheck(predictions);
    renderRouteRiskSegments(usedRoute ? predictions : []);
    setStatus("Weather path updated.");
  } catch (error) {
    console.error(error);
    setStatus("Weather update failed. Retrying shortly.");
  } finally {
    state.inFlight = false;
  }
}

async function buildRoutePredictionsIfPossible() {
  const routeReady = await ensureFreshRoute();
  if (!routeReady) {
    return [];
  }

  return Promise.all(FUTURE_MINUTES.map((minutes) => buildRoutePrediction(minutes)));
}

async function ensureFreshRoute() {
  if (!state.route.destination) {
    return false;
  }
  if (state.current.lat == null || state.current.lon == null) {
    return false;
  }
  if (!routeNeedsRefresh()) {
    return true;
  }
  return planRouteFromCurrentLocation(false);
}

function routeNeedsRefresh() {
  if (!state.route.geometry.length) {
    return true;
  }

  const ageMs = Date.now() - state.route.lastFetchedAt;
  if (ageMs > ROUTE_REFRESH_MS) {
    return true;
  }

  if (!state.route.originAtFetch) {
    return true;
  }

  const movedMeters = distanceMeters(
    state.current.lat,
    state.current.lon,
    state.route.originAtFetch.lat,
    state.route.originAtFetch.lon
  );

  return movedMeters > ROUTE_ORIGIN_REFRESH_METERS;
}

async function planRouteFromCurrentLocation(userInitiated) {
  if (!state.route.destination) {
    return false;
  }

  if (state.current.lat == null || state.current.lon == null) {
    if (userInitiated) {
      setRouteStatus("Current location is not available yet. Allow geolocation or use manual input first.");
    }
    return false;
  }

  try {
    const route = await fetchOsrmRoute(
      { lat: state.current.lat, lon: state.current.lon },
      state.route.destination
    );

    state.route.geometry = route.geometry;
    state.route.totalDurationSec = route.totalDurationSec;
    state.route.totalDistanceM = route.totalDistanceM;
    state.route.cumulativeDistancesM = buildCumulativeDistances(route.geometry);
    state.route.originAtFetch = { lat: state.current.lat, lon: state.current.lon };
    state.route.lastFetchedAt = Date.now();

    renderRouteBase();

    const etaMin = Math.round(route.totalDurationSec / 60);
    setRouteStatus(`Route ready (${etaMin} min ETA, ${(route.totalDistanceM / 1000).toFixed(1)} km).`);
    return true;
  } catch (error) {
    console.error(error);
    if (userInitiated) {
      setRouteStatus("Unable to fetch route right now. Falling back to heading-based forecast.");
    }
    return false;
  }
}

function clearRoutePlan() {
  state.route.destination = null;
  state.route.geometry = [];
  state.route.cumulativeDistancesM = [];
  state.route.totalDistanceM = 0;
  state.route.totalDurationSec = 0;
  state.route.originAtFetch = null;
  state.route.lastFetchedAt = 0;

  if (state.routeBaseLayer) {
    state.map.removeLayer(state.routeBaseLayer);
    state.routeBaseLayer = null;
  }

  clearRouteRiskLayers();
}

function renderRouteBase() {
  if (state.routeBaseLayer) {
    state.map.removeLayer(state.routeBaseLayer);
  }

  if (!state.route.geometry.length) {
    state.routeBaseLayer = null;
    return;
  }

  const latLngs = state.route.geometry.map((p) => [p.lat, p.lon]);
  state.routeBaseLayer = L.polyline(latLngs, {
    color: "#38bdf8",
    weight: 4,
    opacity: 0.7
  }).addTo(state.map);
}

function renderRouteRiskSegments(predictions) {
  clearRouteRiskLayers();

  if (!state.route.destination || !predictions.length) {
    return;
  }

  const checkpoints = [
    { lat: state.current.lat, lon: state.current.lon },
    ...predictions.map((p) => ({ lat: p.lat, lon: p.lon }))
  ];

  for (let i = 1; i < checkpoints.length; i++) {
    const segmentColor = markerColorForPrediction(predictions[i - 1]);
    const layer = L.polyline(
      [
        [checkpoints[i - 1].lat, checkpoints[i - 1].lon],
        [checkpoints[i].lat, checkpoints[i].lon]
      ],
      {
        color: segmentColor,
        weight: 5,
        opacity: 0.9
      }
    ).addTo(state.map);

    state.routeRiskLayers.push(layer);
  }
}

function clearRouteRiskLayers() {
  for (const layer of state.routeRiskLayers) {
    state.map.removeLayer(layer);
  }
  state.routeRiskLayers = [];
}

async function buildHeadingPrediction(minutesAhead) {
  const distanceKm = (state.current.speedMs * minutesAhead * 60) / 1000;
  const projected = projectCoordinate(
    state.current.lat,
    state.current.lon,
    state.current.heading,
    distanceKm
  );

  const targetTime = new Date(Date.now() + minutesAhead * 60 * 1000);
  const future = await fetchFutureWeather(projected.lat, projected.lon, targetTime);

  return {
    minutesAhead,
    lat: projected.lat,
    lon: projected.lon,
    precipitationProbability: future.precipitationProbability,
    weatherCode: future.weatherCode,
    condition: mapWeatherCode(future.weatherCode),
    source: "bearing"
  };
}

async function buildRoutePrediction(minutesAhead) {
  const sample = sampleRoutePointAtSeconds(minutesAhead * 60);
  const fallback = state.route.destination;
  const point = sample || fallback;

  const targetTime = new Date(Date.now() + minutesAhead * 60 * 1000);
  const future = await fetchFutureWeather(point.lat, point.lon, targetTime);

  return {
    minutesAhead,
    lat: point.lat,
    lon: point.lon,
    precipitationProbability: future.precipitationProbability,
    weatherCode: future.weatherCode,
    condition: mapWeatherCode(future.weatherCode),
    source: "route"
  };
}

function sampleRoutePointAtSeconds(targetSeconds) {
  if (state.route.geometry.length < 2) {
    return null;
  }

  if (state.route.totalDurationSec <= 0 || state.route.totalDistanceM <= 0) {
    return state.route.geometry[state.route.geometry.length - 1];
  }

  const clampedSec = Math.min(targetSeconds, state.route.totalDurationSec);
  const targetDistance = (clampedSec / state.route.totalDurationSec) * state.route.totalDistanceM;

  const distances = state.route.cumulativeDistancesM;
  const points = state.route.geometry;

  for (let i = 1; i < distances.length; i++) {
    if (targetDistance <= distances[i]) {
      const startDistance = distances[i - 1];
      const endDistance = distances[i];
      const ratio = endDistance === startDistance ? 0 : (targetDistance - startDistance) / (endDistance - startDistance);
      return interpolatePoint(points[i - 1], points[i], ratio);
    }
  }

  return points[points.length - 1];
}

function buildCumulativeDistances(points) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    const segment = distanceMeters(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    distances.push(distances[i - 1] + segment);
  }
  return distances;
}

function interpolatePoint(a, b, ratio) {
  return {
    lat: a.lat + (b.lat - a.lat) * ratio,
    lon: a.lon + (b.lon - a.lon) * ratio
  };
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

async function fetchOsrmRoute(origin, destination) {
  const url =
    `/api/route?originLat=${encodeURIComponent(origin.lat)}` +
    `&originLon=${encodeURIComponent(origin.lon)}` +
    `&destLat=${encodeURIComponent(destination.lat)}` +
    `&destLon=${encodeURIComponent(destination.lon)}`;

  const data = await fetchJson(url);
  const route = data.routes && data.routes[0];

  if (!route || !route.geometry || !Array.isArray(route.geometry.coordinates)) {
    throw new Error("No route available from OSRM.");
  }

  return {
    geometry: route.geometry.coordinates.map((coord) => ({ lon: coord[0], lat: coord[1] })),
    totalDurationSec: Number(route.duration || 0),
    totalDistanceM: Number(route.distance || 0)
  };
}

async function fetchCurrentWeather(lat, lon) {
  const url =
    `/api/weather/current?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}`;

  const data = await fetchJson(url);
  return {
    precipitationProbability: Number(data.precipitationProbability ?? 0),
    weatherCode: Number(data.weatherCode ?? -1)
  };
}

async function fetchFutureWeather(lat, lon, targetTime) {
  const url =
    `/api/weather/future?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&targetIso=${encodeURIComponent(targetTime.toISOString())}`;

  const data = await fetchJson(url);
  return {
    precipitationProbability: Number(data.precipitationProbability ?? 0),
    weatherCode: Number(data.weatherCode ?? -1)
  };
}

function mapWeatherCode(code) {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "partly cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  return "unknown";
}

function renderTimeline(current, predictions) {
  const currentCondition = mapWeatherCode(current.weatherCode);

  if (!predictions.length) {
    el.timeline.innerHTML =
      `<article class="rounded-lg bg-slate-800 border border-slate-700 p-3 md:col-span-3">` +
      `<p class="text-sm text-slate-300">Current condition: ${currentCondition}. Add heading or destination route to render future predictions.</p>` +
      `</article>`;
    return;
  }

  el.timeline.innerHTML = predictions
    .map((p) => {
      return `
        <article class="rounded-lg bg-slate-800 border border-slate-700 p-3">
          <h3 class="font-semibold">${p.minutesAhead} min</h3>
          <p class="text-sm text-slate-300">Condition: ${p.condition}</p>
          <p class="text-sm text-slate-300">Risk probability: ${p.precipitationProbability}%</p>
          <p class="text-xs text-slate-500">Lat ${p.lat.toFixed(4)}, Lon ${p.lon.toFixed(4)}</p>
          <p class="text-xs text-slate-500">Mode: ${p.source === "route" ? "destination route" : "heading projection"}</p>
        </article>
      `;
    })
    .join("");
}

function renderFutureMarkers(predictions) {
  for (const marker of state.futureMarkers) {
    state.map.removeLayer(marker);
  }
  state.futureMarkers = [];

  for (const p of predictions) {
    const riskClass = markerClassForPrediction(p);
    const icon = L.divIcon({
      html: `<div class="future-marker ${riskClass}"></div>`,
      className: "",
      iconSize: [14, 14]
    });

    const marker = L.marker([p.lat, p.lon], { icon }).addTo(state.map);
    marker.bindPopup(
      `${p.minutesAhead} min<br>Condition: ${p.condition}<br>Chance: ${p.precipitationProbability}%`
    );
    state.futureMarkers.push(marker);
  }
}

function renderVibeCheck(predictions) {
  el.vibeCheck.classList.remove("warning-good", "warning-alert", "warning-caution");

  if (!predictions.length) {
    el.vibeCheck.classList.add("warning-good");
    el.vibeCheck.innerHTML =
      '<i class="fa-solid fa-compass mr-2"></i>Add heading or destination to compute path-aware weather vibe.';
    return;
  }

  const wetRisk = predictions.find((p) => {
    const wetType = p.condition === "rain" || p.condition === "snow";
    return wetType && p.precipitationProbability > 40;
  });

  if (wetRisk) {
    el.vibeCheck.classList.add("warning-alert");
    el.vibeCheck.innerHTML =
      `<i class="fa-solid fa-triangle-exclamation mr-2"></i>` +
      `Vibe warning: ${wetRisk.condition} risk ${wetRisk.precipitationProbability}% in ${wetRisk.minutesAhead} minutes.`;
    return;
  }

  const fogRisk = predictions.find((p) => p.condition === "fog");
  if (fogRisk) {
    el.vibeCheck.classList.add("warning-caution");
    el.vibeCheck.innerHTML =
      `<i class="fa-solid fa-eye-low-vision mr-2"></i>` +
      `Visibility warning: fog expected in ${fogRisk.minutesAhead} minutes. Slow down and stay alert.`;
    return;
  }

  el.vibeCheck.classList.add("warning-good");
  el.vibeCheck.innerHTML = '<i class="fa-solid fa-circle-check mr-2"></i>Vibe is steady for the next hour.';
}

function updateCurrentMarker() {
  const icon = L.divIcon({
    html: '<div class="current-marker"></div>',
    className: "",
    iconSize: [18, 18]
  });

  if (!state.currentMarker) {
    state.currentMarker = L.marker([state.current.lat, state.current.lon], { icon }).addTo(state.map);
  } else {
    state.currentMarker.setLatLng([state.current.lat, state.current.lon]);
  }

  state.map.setView([state.current.lat, state.current.lon], 13);
}

function renderLiveStatus() {
  const kmh = state.current.speedMs * 3.6;
  el.speedMs.textContent = state.current.speedMs.toFixed(2);
  el.speedKmh.textContent = kmh.toFixed(2);
  el.headingText.textContent = state.current.heading == null ? "N/A" : `${state.current.heading.toFixed(0)} deg`;
}

function hasSignificantSpeedChange(current, previous) {
  if (previous == null) return true;
  return Math.abs(current - previous) >= SPEED_DELTA_MS;
}

function hasSignificantHeadingChange(current, previous) {
  if (current == null) return false;
  if (previous == null) return true;
  return angularDifferenceDeg(current, previous) >= HEADING_DELTA_DEG;
}

function angularDifferenceDeg(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function markerClassForPrediction(prediction) {
  if (prediction.condition === "fog") {
    return prediction.weatherCode === 48 ? "future-fog-high" : "future-fog";
  }

  if (prediction.precipitationProbability > 40) return "future-high";
  if (prediction.precipitationProbability > 20) return "future-mid";
  return "future-low";
}

function markerColorForPrediction(prediction) {
  const markerClass = markerClassForPrediction(prediction);
  if (markerClass === "future-high") return "#ef4444";
  if (markerClass === "future-mid") return "#fb923c";
  if (markerClass === "future-fog-high") return "#7c3aed";
  if (markerClass === "future-fog") return "#a78bfa";
  return "#facc15";
}

function projectCoordinate(latDeg, lonDeg, bearingDeg, distanceKm) {
  const R = 6371;
  const lat1 = toRad(latDeg);
  const lon1 = toRad(lonDeg);
  const brng = toRad(normalizeHeading(bearingDeg));
  const dOverR = distanceKm / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dOverR) +
    Math.cos(lat1) * Math.sin(dOverR) * Math.cos(brng)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(dOverR) * Math.cos(lat1),
    Math.cos(dOverR) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: toDeg(lat2),
    lon: normalizeLongitude(toDeg(lon2))
  };
}

function normalizeHeading(value) {
  const n = Number.isFinite(value) ? value : 0;
  return ((n % 360) + 360) % 360;
}

function normalizeLongitude(value) {
  return ((value + 540) % 360) - 180;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function setStatus(text) {
  el.statusText.textContent = text;
}

function setRouteStatus(text) {
  el.routeStatus.textContent = text;
}

function showManualHint(text) {
  el.manualHint.classList.remove("hidden");
  el.manualHint.textContent = text;
}

function hideManualHint() {
  el.manualHint.classList.add("hidden");
  el.manualHint.textContent = "";
}
