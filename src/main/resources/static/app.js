const FUTURE_MINUTES = [15, 30, 60];
const UPDATE_INTERVAL_MS = 3000;
const SPEED_DELTA_MS = 0.5;
const HEADING_DELTA_DEG = 10;
const ROUTE_REFRESH_MS = 60000;
const ROUTE_ORIGIN_REFRESH_METERS = 200;
const ADDIS_CENTER = { lat: 9.03, lon: 38.74 };
const ADDIS_BOUNDS = {
  minLat: 8.8,
  maxLat: 9.2,
  minLon: 38.6,
  maxLon: 39.05
};
const ADDIS_PRESETS = [
  { name: "Bole Airport", lat: 8.9806, lon: 38.7578 },
  { name: "Meskel Square", lat: 9.0370, lon: 38.7617 },
  { name: "Mexico Square", lat: 9.0320, lon: 38.7520 },
  { name: "Piassa", lat: 9.0352, lon: 38.7469 },
  { name: "Megenagna", lat: 9.0108, lon: 38.8148 },
  { name: "CMC", lat: 9.0409, lon: 38.8501 }
];

const state = {
  map: null,
  baseTileLayer: null,
  mapStyle: "dark",
  currentMarker: null,
  originMarker: null,
  destinationMarker: null,
  futureMarkers: [],
  routeBaseLayer: null,
  routeRiskLayers: [],
  inFlight: false,
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
    originOverride: null,
    destination: null,
    geometry: [],
    cumulativeDistancesM: [],
    totalDistanceM: 0,
    totalDurationSec: 0,
    originAtFetch: null,
    lastFetchedAt: 0
  },
  geo: {
    permissionState: "unknown",
    secureContextOk: true
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
  geoHelp: document.getElementById("geoHelp"),
  retryGeoBtn: document.getElementById("retryGeoBtn"),
  destinationForm: document.getElementById("destinationForm"),
  clearRouteBtn: document.getElementById("clearRouteBtn"),
  mapPickTarget: document.getElementById("mapPickTarget"),
  mapStyleDark: document.getElementById("mapStyleDark"),
  mapStyleSatellite: document.getElementById("mapStyleSatellite"),
  useCurrentOriginBtn: document.getElementById("useCurrentOriginBtn"),
  recenterAddisBtn: document.getElementById("recenterAddisBtn"),
  presetPlaceSelect: document.getElementById("presetPlaceSelect"),
  presetTarget: document.getElementById("presetTarget"),
  applyPresetBtn: document.getElementById("applyPresetBtn"),
  originLat: document.getElementById("originLat"),
  originLon: document.getElementById("originLon"),
  destLat: document.getElementById("destLat"),
  destLon: document.getElementById("destLon")
};

init();

function init() {
  initMap();
  bindMapStyleToggle();
  bindQuickActions();
  bindRetryGeolocation();
  bindDestinationForm();
  renderTimelinePlaceholder("Enable geolocation or enter origin/destination to see 15/30/60 minute forecasts.");
  startGeoWatch();
  startScheduledUpdates();
}

function initMap() {
  state.map = L.map("map").setView([ADDIS_CENTER.lat, ADDIS_CENTER.lon], 12);
  state.map.setMaxBounds(getAddisLeafletBounds());
  state.map.options.maxBoundsViscosity = 1.0;
  setMapStyle("dark");

  state.map.on("click", (event) => {
    const lat = event.latlng.lat.toFixed(6);
    const lon = event.latlng.lng.toFixed(6);

    if (!isInsideCoverage(Number(lat), Number(lon))) {
      setRouteStatus("Selected point is outside Addis coverage. Pick a point inside Addis Ababa.");
      return;
    }

    if (el.mapPickTarget.value === "origin") {
      applyOriginSelection(Number(lat), Number(lon), "Origin selected from map. Click Plan Route to update route forecast.");
      return;
    }

    applyDestinationSelection(Number(lat), Number(lon), "Destination selected from map. Click Plan Route to update route forecast.");
  });
}

function bindQuickActions() {
  if (el.recenterAddisBtn) {
    el.recenterAddisBtn.addEventListener("click", () => {
      state.map.fitBounds(getAddisLeafletBounds(), { padding: [24, 24] });
      setRouteStatus("Map recentered to Addis coverage area.");
    });
  }

  if (el.useCurrentOriginBtn) {
    el.useCurrentOriginBtn.addEventListener("click", () => {
      if (state.current.lat == null || state.current.lon == null) {
        setRouteStatus("Live location is not available yet. Allow geolocation or type origin coordinates.");
        return;
      }

      if (!isInsideCoverage(state.current.lat, state.current.lon)) {
        setRouteStatus("Your current location is outside Addis coverage. Pick an Addis origin manually.");
        return;
      }

      applyOriginSelection(state.current.lat, state.current.lon, "Origin set from live location.");
      setRouteStatus("Origin set from live location. Now choose destination and plan route.");
    });
  }

  if (el.applyPresetBtn) {
    el.applyPresetBtn.addEventListener("click", () => {
      const presetValue = (el.presetPlaceSelect && el.presetPlaceSelect.value) || "";
      if (!presetValue) {
        setRouteStatus("Choose a preset place first.");
        return;
      }

      const [latRaw, lonRaw] = presetValue.split(",");
      const lat = Number(latRaw);
      const lon = Number(lonRaw);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setRouteStatus("Selected preset is invalid. Please choose another place.");
        return;
      }

      const selectedName = ADDIS_PRESETS.find((p) => p.lat === lat && p.lon === lon)?.name || "preset point";
      const target = (el.presetTarget && el.presetTarget.value) || "destination";
      if (target === "origin") {
        applyOriginSelection(lat, lon, `${selectedName} set as origin.`);
        setRouteStatus(`${selectedName} applied as origin. Choose destination and plan route.`);
      } else {
        applyDestinationSelection(lat, lon, `${selectedName} set as destination.`);
        setRouteStatus(`${selectedName} applied as destination. Click Plan Route to refresh forecast.`);
      }

      state.map.setView([lat, lon], 13);
    });
  }
}

function bindMapStyleToggle() {
  if (el.mapStyleDark) {
    bindStyleButton(el.mapStyleDark, "dark");
  }

  if (el.mapStyleSatellite) {
    bindStyleButton(el.mapStyleSatellite, "satellite");
  }

  updateMapStyleToggleUi();
}

function bindStyleButton(button, style) {
  const activate = (event) => {
    if (event) {
      event.preventDefault();
    }
    setMapStyle(style);
  };

  button.addEventListener("click", activate);
  button.addEventListener("pointerup", activate);
  button.addEventListener("touchend", activate, { passive: false });
}

function setMapStyle(style) {
  const nextStyle = style === "satellite" ? "satellite" : "dark";

  if (!state.map) {
    state.mapStyle = nextStyle;
    updateMapStyleToggleUi();
    return;
  }

  if (state.baseTileLayer) {
    state.map.removeLayer(state.baseTileLayer);
  }

  if (nextStyle === "satellite") {
    state.baseTileLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 19
      }
    );
  } else {
    state.baseTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 19
    });
  }

  state.baseTileLayer.addTo(state.map);
  state.mapStyle = nextStyle;
  updateMapStyleToggleUi();
}

function updateMapStyleToggleUi() {
  if (el.mapStyleDark) {
    const darkActive = state.mapStyle === "dark";
    el.mapStyleDark.className = darkActive
      ? "bg-indigo-600 text-white px-3 py-1.5 font-semibold transition cursor-pointer select-none"
      : "bg-slate-800 text-slate-200 px-3 py-1.5 font-semibold transition cursor-pointer select-none";
    el.mapStyleDark.setAttribute("aria-pressed", String(darkActive));
  }

  if (el.mapStyleSatellite) {
    const satActive = state.mapStyle === "satellite";
    el.mapStyleSatellite.className = satActive
      ? "bg-indigo-600 text-white px-3 py-1.5 font-semibold transition cursor-pointer select-none"
      : "bg-slate-800 text-slate-200 px-3 py-1.5 font-semibold transition cursor-pointer select-none";
    el.mapStyleSatellite.setAttribute("aria-pressed", String(satActive));
  }
}

function bindRetryGeolocation() {
  el.retryGeoBtn.addEventListener("click", () => {
    setStatus("Retrying geolocation...");
    startGeoWatch();
  });
}

function bindDestinationForm() {
  el.destinationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const originLatRaw = (el.originLat.value || "").trim();
    const originLonRaw = (el.originLon.value || "").trim();
    const destLat = Number(el.destLat.value);
    const destLon = Number(el.destLon.value);

    if (!Number.isFinite(destLat) || !Number.isFinite(destLon)) {
      setRouteStatus("Please enter a valid destination latitude and longitude.");
      return;
    }

    if (!isInsideCoverage(destLat, destLon)) {
      setRouteStatus("Destination is outside Addis coverage. Enter a destination inside Addis Ababa.");
      return;
    }

    const hasOriginInput = originLatRaw !== "" || originLonRaw !== "";
    if (hasOriginInput) {
      const originLat = Number(originLatRaw);
      const originLon = Number(originLonRaw);
      if (!Number.isFinite(originLat) || !Number.isFinite(originLon)) {
        setRouteStatus("If you provide origin, both origin latitude and longitude must be valid numbers.");
        return;
      }
      if (!isInsideCoverage(originLat, originLon)) {
        setRouteStatus("Origin is outside Addis coverage. Enter an origin inside Addis Ababa.");
        return;
      }
      applyOriginSelection(originLat, originLon, null);
    } else {
      state.route.originOverride = null;
      removeRoutePointMarker("origin");
    }

    applyDestinationSelection(destLat, destLon, null);
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

function applyOriginSelection(lat, lon, statusMessage) {
  if (!isInsideCoverage(lat, lon)) {
    if (statusMessage) {
      setRouteStatus("Origin is outside Addis coverage. Choose a point inside Addis Ababa.");
    }
    return false;
  }

  el.originLat.value = lat.toFixed(6);
  el.originLon.value = lon.toFixed(6);
  state.route.originOverride = { lat, lon };
  upsertRoutePointMarker("origin", lat, lon);

  if (statusMessage) {
    setRouteStatus(statusMessage);
  }
  return true;
}

function applyDestinationSelection(lat, lon, statusMessage) {
  if (!isInsideCoverage(lat, lon)) {
    if (statusMessage) {
      setRouteStatus("Destination is outside Addis coverage. Choose a point inside Addis Ababa.");
    }
    return false;
  }

  el.destLat.value = lat.toFixed(6);
  el.destLon.value = lon.toFixed(6);
  state.route.destination = { lat, lon };
  upsertRoutePointMarker("destination", lat, lon);

  if (statusMessage) {
    setRouteStatus(statusMessage);
  }
  return true;
}

function upsertRoutePointMarker(kind, lat, lon) {
  const markerRef = kind === "origin" ? "originMarker" : "destinationMarker";
  const cssClass = kind === "origin" ? "route-point-origin" : "route-point-destination";

  const icon = L.divIcon({
    html: `<div class="route-point ${cssClass}"></div>`,
    className: "",
    iconSize: [18, 18]
  });

  if (!state[markerRef]) {
    const marker = L.marker([lat, lon], { icon, draggable: true, autoPan: true }).addTo(state.map);
    marker.on("dragend", () => {
      const latLng = marker.getLatLng();
      if (!isInsideCoverage(latLng.lat, latLng.lng)) {
        setRouteStatus("Point must stay inside Addis coverage. Drag it back inside Addis.");
        if (kind === "origin" && state.route.originOverride) {
          marker.setLatLng([state.route.originOverride.lat, state.route.originOverride.lon]);
        } else if (kind === "destination" && state.route.destination) {
          marker.setLatLng([state.route.destination.lat, state.route.destination.lon]);
        }
        return;
      }

      if (kind === "origin") {
        applyOriginSelection(latLng.lat, latLng.lng, "Origin marker moved. Click Plan Route to refresh route forecast.");
      } else {
        applyDestinationSelection(latLng.lat, latLng.lng, "Destination marker moved. Click Plan Route to refresh route forecast.");
      }
    });

    state[markerRef] = marker;
    return;
  }

  state[markerRef].setLatLng([lat, lon]);
}

function removeRoutePointMarker(kind) {
  const markerRef = kind === "origin" ? "originMarker" : "destinationMarker";
  if (!state[markerRef]) {
    return;
  }
  state.map.removeLayer(state[markerRef]);
  state[markerRef] = null;
}

async function startGeoWatch() {
  const secureContextOk = isSecureLocationContext();
  state.geo.secureContextOk = secureContextOk;

  if (!secureContextOk) {
    state.geo.permissionState = "unsupported";
    setStatus("Geolocation needs HTTPS or localhost. Use origin/destination fields for manual forecasting.");
    setGeoHelp("Open this app from HTTPS (or localhost). Addis-only mode still works with manual origin and destination inside Addis.");
    renderTimelinePlaceholder("Location is blocked by insecure context. Enter origin and destination to continue.");
    return;
  }

  if (!("geolocation" in navigator)) {
    state.geo.permissionState = "unsupported";
    setStatus("Geolocation is not supported by this browser. Use origin/destination fields.");
    setGeoHelp("This browser does not expose the Geolocation API. Manual route forecasting remains available.");
    return;
  }

  const permissionState = await getLocationPermissionState();
  state.geo.permissionState = permissionState;

  if (permissionState === "denied") {
    setStatus("Geolocation denied. Enable location permission in browser/site settings, or use manual origin/destination.");
    setGeoHelp("Permission is denied. Change site location permission to Allow, then press Retry Geolocation. You can still forecast inside Addis manually.");
    renderTimelinePlaceholder("Location permission denied. Enter origin and destination to run forecasts now.");
    return;
  }

  if (permissionState === "prompt") {
    setStatus("Waiting for location permission prompt...");
    setGeoHelp("Accept the browser location prompt to enable live tracking. You can still use manual coordinates.");
  } else {
    setGeoHelp("Live geolocation is active. If this stops, check browser/site permission and OS location settings.");
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
  if (isInsideCoverage(state.current.lat, state.current.lon)) {
    setStatus("Live geolocation active.");
    setGeoHelp("Receiving live position updates inside Addis. You can override route origin manually at any time.");
  } else {
    setStatus("Current location is outside Addis coverage. Use Addis origin/destination inputs.");
    setGeoHelp("This app currently forecasts inside Addis only. Enter origin and destination points within Addis.");
  }
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
  if (!error) {
    setStatus("Geolocation unavailable. Use origin/destination fields or Retry Geolocation.");
    setGeoHelp("Unable to read device location right now. Manual route forecasting is still available.");
    renderTimelinePlaceholder("Location unavailable. Enter origin and destination, then plan route to get forecasts.");
    return;
  }

  if (error.code === 1) {
    state.geo.permissionState = "denied";
    setStatus("Geolocation denied. Enable location access and press Retry Geolocation, or continue manually.");
    setGeoHelp("Location permission is blocked. Allow it in browser/site settings and retry.");
    renderTimelinePlaceholder("Location access denied. Enter origin and destination, then plan route to get forecasts.");
    return;
  }

  if (error.code === 2) {
    setStatus("Position unavailable. Check GPS/network, then Retry Geolocation or use manual origin/destination.");
    setGeoHelp("Signal is weak or unavailable. Move to a clearer area, enable GPS, or continue in manual mode.");
    renderTimelinePlaceholder("Position unavailable. Use manual origin and destination if needed.");
    return;
  }

  if (error.code === 3) {
    setStatus("Geolocation timed out. Press Retry Geolocation or use manual origin/destination.");
    setGeoHelp("Location request timed out. Check connectivity/GPS, then retry.");
    renderTimelinePlaceholder("Location timeout. Enter origin and destination to continue instantly.");
    return;
  }

  setStatus("Geolocation error. Use manual origin/destination or Retry Geolocation.");
  setGeoHelp("An unexpected geolocation error occurred. Manual route mode remains available.");
  renderTimelinePlaceholder("Location error. Enter origin and destination, then plan route to get forecasts.");
}

function startScheduledUpdates() {
  state.intervalId = setInterval(() => {
    if (!hasActiveOriginPoint()) {
      return;
    }
    updateEverything();
  }, UPDATE_INTERVAL_MS);
}

async function updateEverything() {
  if (state.inFlight) {
    return;
  }

  const activeOrigin = getActiveOriginPoint();
  if (!activeOrigin) {
    renderTimelinePlaceholder("No active origin yet. Add origin/destination or allow geolocation to start forecasting.");
    return;
  }

  if (!isInsideCoverage(activeOrigin.lat, activeOrigin.lon)) {
    setStatus("Origin is outside Addis coverage.");
    renderTimelinePlaceholder("Forecasting is available only inside Addis Ababa. Enter Addis origin and destination.");
    return;
  }

  state.inFlight = true;
  setStatus("Refreshing weather path...");

  try {
    const current = await fetchCurrentWeather(activeOrigin.lat, activeOrigin.lon);

    let predictions = [];
    let usedRoute = false;

    if (state.route.destination) {
      predictions = await buildRoutePredictionsIfPossible();
      usedRoute = predictions.length > 0;
    }

    if (!predictions.length) {
      if (hasLiveHeadingProjection()) {
        predictions = await buildHeadingPredictionsBatch();
      }
    }

    renderTimeline(current, predictions);
    renderFutureMarkers(predictions);
    renderVibeCheck(predictions);
    renderRouteRiskSegments(usedRoute ? predictions : []);
    setStatus("Weather path updated.");
  } catch (error) {
    console.error(error);
    setStatus("Weather update failed. Retrying shortly.");
    renderTimelinePlaceholder("Weather data is temporarily unavailable. We will retry automatically.");
  } finally {
    state.inFlight = false;
  }
}

async function buildRoutePredictionsIfPossible() {
  const routeReady = await ensureFreshRoute();
  if (!routeReady) {
    return [];
  }

  return buildRoutePredictionsBatch();
}

async function ensureFreshRoute() {
  if (!state.route.destination) {
    return false;
  }
  if (!getRouteStartPoint()) {
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

  if (state.route.originOverride) {
    return false;
  }

  if (!state.route.originAtFetch) {
    return true;
  }

  if (state.current.lat == null || state.current.lon == null) {
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

  const origin = state.route.originOverride || (
    state.current.lat != null && state.current.lon != null
      ? { lat: state.current.lat, lon: state.current.lon }
      : null
  );

  if (!origin) {
    if (userInitiated) {
      setRouteStatus("Origin is not available yet. Enter origin coordinates or allow geolocation/manual location first.");
    }
    return false;
  }

  if (!isInsideCoverage(origin.lat, origin.lon)) {
    if (userInitiated) {
      setRouteStatus("Origin is outside Addis coverage. Choose an origin inside Addis Ababa.");
    }
    return false;
  }

  if (!isInsideCoverage(state.route.destination.lat, state.route.destination.lon)) {
    if (userInitiated) {
      setRouteStatus("Destination is outside Addis coverage. Choose a destination inside Addis Ababa.");
    }
    return false;
  }

  try {
    const route = await fetchOsrmRoute(
      origin,
      state.route.destination
    );

    state.route.geometry = route.geometry;
    state.route.totalDurationSec = route.totalDurationSec;
    state.route.totalDistanceM = route.totalDistanceM;
    state.route.cumulativeDistancesM = buildCumulativeDistances(route.geometry);
    state.route.originAtFetch = origin;
    state.route.lastFetchedAt = Date.now();

    renderRouteBase();

    const etaMin = Math.round(route.totalDurationSec / 60);
    setRouteStatus(`Route ready (${etaMin} min ETA, ${(route.totalDistanceM / 1000).toFixed(1)} km).`);
    return true;
  } catch (error) {
    console.warn(error);
    if (userInitiated) {
      if (error && (error.code === "NO_ROUTE" || error.status === 422)) {
        setRouteStatus("No drivable route found between origin and destination. Pick points on connected roads.");
      } else {
        setRouteStatus(error && error.message
          ? `${error.message} Falling back to heading-based forecast.`
          : "Unable to fetch route right now. Falling back to heading-based forecast.");
      }
    }
    return false;
  }
}

function clearRoutePlan() {
  state.route.originOverride = null;
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

  const startPoint = getRouteStartPoint();
  if (!startPoint) {
    return;
  }

  const checkpoints = [
    startPoint,
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

function getRouteStartPoint() {
  if (state.route.originOverride) {
    return state.route.originOverride;
  }
  if (state.current.lat != null && state.current.lon != null) {
    return { lat: state.current.lat, lon: state.current.lon };
  }
  return null;
}

function getActiveOriginPoint() {
  return getRouteStartPoint();
}

function hasActiveOriginPoint() {
  return getActiveOriginPoint() != null;
}

function hasLiveHeadingProjection() {
  return state.current.lat != null &&
    state.current.lon != null &&
    state.current.heading != null;
}

function clearRouteRiskLayers() {
  for (const layer of state.routeRiskLayers) {
    state.map.removeLayer(layer);
  }
  state.routeRiskLayers = [];
}

async function buildHeadingPredictionsBatch() {
  const checkpoints = FUTURE_MINUTES.map((minutes) => createHeadingCheckpoint(minutes));
  return hydratePredictionsFromBatch(checkpoints, "bearing");
}

function createHeadingCheckpoint(minutesAhead) {
  const distanceKm = (state.current.speedMs * minutesAhead * 60) / 1000;
  const projected = projectCoordinate(
    state.current.lat,
    state.current.lon,
    state.current.heading,
    distanceKm
  );

  return {
    minutesAhead,
    lat: projected.lat,
    lon: projected.lon,
    targetTime: new Date(Date.now() + minutesAhead * 60 * 1000)
  };
}

async function buildRoutePredictionsBatch() {
  const checkpoints = FUTURE_MINUTES.map((minutes) => createRouteCheckpoint(minutes));
  return hydratePredictionsFromBatch(checkpoints, "route");
}

function createRouteCheckpoint(minutesAhead) {
  const sample = sampleRoutePointAtSeconds(minutesAhead * 60);
  const fallback = state.route.destination;
  const point = sample ? sample.point : fallback;

  const hasDuration = state.route.totalDurationSec > 0;
  const sampledSeconds = sample ? sample.sampledSeconds : state.route.totalDurationSec;
  const remainingSeconds = hasDuration ? Math.max(0, state.route.totalDurationSec - sampledSeconds) : null;
  const etaMinutes = remainingSeconds == null ? null : Math.ceil(remainingSeconds / 60);

  return {
    minutesAhead,
    lat: point.lat,
    lon: point.lon,
    targetTime: new Date(Date.now() + minutesAhead * 60 * 1000),
    pathLabel: classifyRouteCheckpoint(sample),
    etaMinutes
  };
}

async function hydratePredictionsFromBatch(checkpoints, source) {
  const futures = await fetchFutureWeatherBatch(checkpoints);

  return checkpoints.map((checkpoint, index) => {
    const future = futures[index] || { precipitationProbability: 0, weatherCode: -1 };
    return {
      minutesAhead: checkpoint.minutesAhead,
      lat: checkpoint.lat,
      lon: checkpoint.lon,
      precipitationProbability: future.precipitationProbability,
      weatherCode: future.weatherCode,
      condition: mapWeatherCode(future.weatherCode),
      source,
      pathLabel: checkpoint.pathLabel || null,
      etaMinutes: checkpoint.etaMinutes ?? null
    };
  });
}

function classifyRouteCheckpoint(sample) {
  if (!sample || sample.reachedDestination) {
    return "destination";
  }

  if (sample.progressRatio <= 0.2) {
    return "origin-side";
  }

  return "en-route";
}

function sampleRoutePointAtSeconds(targetSeconds) {
  if (state.route.geometry.length < 2) {
    return null;
  }

  if (state.route.totalDurationSec <= 0 || state.route.totalDistanceM <= 0) {
    const lastPoint = state.route.geometry[state.route.geometry.length - 1];
    return {
      point: lastPoint,
      sampledSeconds: targetSeconds,
      progressRatio: 1,
      reachedDestination: true
    };
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
      return {
        point: interpolatePoint(points[i - 1], points[i], ratio),
        sampledSeconds: clampedSec,
        progressRatio: targetDistance / state.route.totalDistanceM,
        reachedDestination: clampedSec >= state.route.totalDurationSec
      };
    }
  }

  return {
    point: points[points.length - 1],
    sampledSeconds: clampedSec,
    progressRatio: 1,
    reachedDestination: true
  };
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

async function fetchFutureWeatherBatch(checkpoints) {
  const body = checkpoints.map((checkpoint) => ({
    latitude: checkpoint.lat,
    longitude: checkpoint.lon,
    targetIso: checkpoint.targetTime.toISOString()
  }));

  const data = await fetchJson("/api/weather/future/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!Array.isArray(data)) {
    throw new Error("Unexpected batch weather response shape");
  }

  return data.map((item) => ({
    precipitationProbability: Number(item.precipitationProbability ?? 0),
    weatherCode: Number(item.weatherCode ?? -1)
  }));
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
    renderTimelinePlaceholder(
      `Current condition: ${currentCondition}. Add heading or destination route to render future predictions.`
    );
    return;
  }

  el.timeline.innerHTML = predictions
    .map((p) => {
      const pathPointText = p.source === "route"
        ? `Path point: ${p.pathLabel || "destination"}`
        : "Path point: heading projection";
      const etaText = p.source === "route" && p.etaMinutes != null
        ? `ETA from now: ${p.etaMinutes} min`
        : null;

      return `
        <article class="rounded-lg bg-slate-800 border border-slate-700 p-3">
          <h3 class="font-semibold">${p.minutesAhead} min</h3>
          <p class="text-sm text-slate-300">Condition: ${p.condition}</p>
          <p class="text-sm text-slate-300">Risk probability: ${p.precipitationProbability}%</p>
          <p class="text-xs text-slate-500">Lat ${p.lat.toFixed(4)}, Lon ${p.lon.toFixed(4)}</p>
          <p class="text-xs text-slate-500">${pathPointText}</p>
          ${etaText ? `<p class="text-xs text-slate-500">${etaText}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderTimelinePlaceholder(message) {
  el.timeline.innerHTML =
    `<article class="rounded-lg bg-slate-800 border border-slate-700 p-3 md:col-span-3">` +
    `<p class="text-sm text-slate-300">${message}</p>` +
    `</article>`;
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
    const pathPoint = p.source === "route"
      ? `Path point: ${p.pathLabel || "destination"}<br>`
      : "Path point: heading projection<br>";
    marker.bindPopup(
      `${p.minutesAhead} min<br>${pathPoint}Condition: ${p.condition}<br>Chance: ${p.precipitationProbability}%`
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

async function fetchJson(url, options = undefined) {
  const response = await fetch(url, options);
  const rawBody = await response.text();
  let parsedBody = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    const message =
      (parsedBody && (parsedBody.message || parsedBody.detail || parsedBody.error)) ||
      `Request failed (${response.status})`;
    const requestError = new Error(message);
    requestError.status = response.status;
    requestError.code = parsedBody && parsedBody.code ? parsedBody.code : null;
    requestError.payload = parsedBody;
    throw requestError;
  }

  if (parsedBody != null) {
    return parsedBody;
  }

  return null;
}

function setStatus(text) {
  el.statusText.textContent = text;
}

function setRouteStatus(text) {
  el.routeStatus.textContent = text;
}

function setGeoHelp(text) {
  if (!el.geoHelp) {
    return;
  }
  el.geoHelp.textContent = text;
}

function isSecureLocationContext() {
  if (window.isSecureContext) {
    return true;
  }

  return window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";
}

function isInsideCoverage(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }

  return lat >= ADDIS_BOUNDS.minLat &&
    lat <= ADDIS_BOUNDS.maxLat &&
    lon >= ADDIS_BOUNDS.minLon &&
    lon <= ADDIS_BOUNDS.maxLon;
}

function getAddisLeafletBounds() {
  return [
    [ADDIS_BOUNDS.minLat, ADDIS_BOUNDS.minLon],
    [ADDIS_BOUNDS.maxLat, ADDIS_BOUNDS.maxLon]
  ];
}

async function getLocationPermissionState() {
  if (!("permissions" in navigator) || typeof navigator.permissions.query !== "function") {
    return "unknown";
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state || "unknown";
  } catch (error) {
    return "unknown";
  }
}

