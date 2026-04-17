const FUTURE_MINUTES = [15, 30, 60];
const UPDATE_INTERVAL_MS = 3000;
const SPEED_DELTA_MS = 0.5;
const HEADING_DELTA_DEG = 10;
const CACHE_TTL_MS = 30000;

const state = {
  map: null,
  currentMarker: null,
  futureMarkers: [],
  inFlight: false,
  manualMode: false,
  watchId: null,
  intervalId: null,
  cache: new Map(),
  last: { speedMs: null, heading: null },
  current: {
    lat: null,
    lon: null,
    speedMs: 0,
    heading: null
  }
};

const el = {
  speedKmh: document.getElementById("speedKmh"),
  speedMs: document.getElementById("speedMs"),
  headingText: document.getElementById("headingText"),
  statusText: document.getElementById("statusText"),
  timeline: document.getElementById("timeline"),
  vibeCheck: document.getElementById("vibeCheck"),
  manualSection: document.getElementById("manualSection"),
  manualHint: document.getElementById("manualHint"),
  manualForm: document.getElementById("manualForm"),
  manualLat: document.getElementById("manualLat"),
  manualLon: document.getElementById("manualLon"),
  manualSpeed: document.getElementById("manualSpeed"),
  manualHeading: document.getElementById("manualHeading")
};

init();

function init() {
  initMap();
  bindManualForm();
  startGeoWatch();
  startScheduledUpdates();
}

function initMap() {
  state.map = L.map("map").setView([9.03, 38.74], 11);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19
  }).addTo(state.map);
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
    if (state.current.heading == null) {
      if (state.manualMode) {
        showManualHint("Heading missing: add heading to project 15/30/60 minute path.");
      }
    } else {
      hideManualHint();
      predictions = await Promise.all(FUTURE_MINUTES.map((minutes) => buildPrediction(minutes)));
    }

    renderTimeline(current, predictions);
    renderFutureMarkers(predictions);
    renderVibeCheck(predictions);
    setStatus("Weather path updated.");
  } catch (error) {
    console.error(error);
    setStatus("Weather update failed. Retrying shortly.");
  } finally {
    state.inFlight = false;
  }
}

async function buildPrediction(minutesAhead) {
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
    condition: mapWeatherCode(future.weatherCode)
  };
}

async function fetchCurrentWeather(lat, lon) {
  const roundedLat = roundCoord(lat);
  const roundedLon = roundCoord(lon);
  const cacheKey = `current:${roundedLat}:${roundedLon}`;

  return getOrSetCache(cacheKey, async () => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      "&current=precipitation_probability,weather_code";

    const data = await fetchJson(url);
    return {
      precipitationProbability: Number(data.current?.precipitation_probability ?? 0),
      weatherCode: Number(data.current?.weather_code ?? -1)
    };
  });
}

async function fetchFutureWeather(lat, lon, targetTime) {
  const hourIso = targetTime.toISOString().slice(0, 13);
  const roundedLat = roundCoord(lat);
  const roundedLon = roundCoord(lon);
  const cacheKey = `future:${roundedLat}:${roundedLon}:${hourIso}`;

  return getOrSetCache(cacheKey, async () => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      "&hourly=precipitation_probability,weather_code" +
      "&forecast_days=1&timezone=auto";

    const data = await fetchJson(url);
    const times = data.hourly?.time ?? [];
    const probs = data.hourly?.precipitation_probability ?? [];
    const codes = data.hourly?.weather_code ?? [];

    if (!times.length) {
      return { precipitationProbability: 0, weatherCode: -1 };
    }

    const target = targetTime.getTime();
    let bestIdx = 0;
    let bestDiff = Number.POSITIVE_INFINITY;

    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]).getTime();
      const diff = Math.abs(t - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    return {
      precipitationProbability: Number(probs[bestIdx] ?? 0),
      weatherCode: Number(codes[bestIdx] ?? -1)
    };
  });
}

function getOrSetCache(key, producer) {
  const now = Date.now();
  const existing = state.cache.get(key);
  if (existing && existing.expiresAt > now) {
    return Promise.resolve(existing.value);
  }

  return producer().then((value) => {
    state.cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  });
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
      `<p class="text-sm text-slate-300">Current condition: ${currentCondition}. Add heading to render future predictions.</p>` +
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
      '<i class="fa-solid fa-compass mr-2"></i>Add heading to compute path-aware weather vibe.';
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

function roundCoord(value) {
  return Number(value).toFixed(3);
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

function showManualHint(text) {
  el.manualHint.classList.remove("hidden");
  el.manualHint.textContent = text;
}

function hideManualHint() {
  el.manualHint.classList.add("hidden");
  el.manualHint.textContent = "";
}

