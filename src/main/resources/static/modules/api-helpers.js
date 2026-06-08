(function () {
  async function fetchJson(url, options) {
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
        "Request failed (" + response.status + ")";
      const requestError = new Error(message);
      requestError.status = response.status;
      requestError.code = parsedBody && parsedBody.code ? parsedBody.code : null;
      requestError.payload = parsedBody;
      throw requestError;
    }

    return parsedBody;
  }

  async function fetchOsrmRoute(origin, destination, profile) {
    const safeProfile = profile || "driving";
    const url =
      "/api/route?profile=" + encodeURIComponent(safeProfile) +
      "&originLat=" + encodeURIComponent(origin.lat) +
      "&originLon=" + encodeURIComponent(origin.lon) +
      "&destLat=" + encodeURIComponent(destination.lat) +
      "&destLon=" + encodeURIComponent(destination.lon);

    const data = await fetchJson(url);
    const route = data && data.routes ? data.routes[0] : null;

    if (!route || !route.geometry || !Array.isArray(route.geometry.coordinates)) {
      throw new Error("No route available from OSRM.");
    }

    return {
      geometry: route.geometry.coordinates.map(function (coord) {
        return { lon: coord[0], lat: coord[1] };
      }),
      totalDurationSec: Number(route.duration || 0),
      totalDistanceM: Number(route.distance || 0)
    };
  }

  async function fetchCurrentWeather(lat, lon) {
    const url =
      "/api/weather/current?latitude=" + encodeURIComponent(lat) +
      "&longitude=" + encodeURIComponent(lon);

    const data = await fetchJson(url);
    return {
      precipitationProbability: Number(data.precipitationProbability || 0),
      weatherCode: Number(data.weatherCode != null ? data.weatherCode : -1)
    };
  }

  async function fetchFutureWeatherBatch(checkpoints) {
    const body = checkpoints.map(function (checkpoint) {
      return {
        latitude: checkpoint.lat,
        longitude: checkpoint.lon,
        targetIso: checkpoint.targetTime.toISOString()
      };
    });

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

    return data.map(function (item) {
      return {
        precipitationProbability: Number(item.precipitationProbability || 0),
        weatherCode: Number(item.weatherCode != null ? item.weatherCode : -1)
      };
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

  window.WaytherApi = {
    fetchJson,
    fetchOsrmRoute,
    fetchCurrentWeather,
    fetchFutureWeatherBatch,
    mapWeatherCode
  };
})();

